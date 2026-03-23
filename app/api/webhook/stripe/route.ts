// /api/webhook/stripe — handles Stripe webhook events to finalize bids.
//
// BIDDING WAR FLOW (on payment_intent.succeeded):
// 1. Verify the webhook signature. Since each creator has their own Stripe key,
//    we look up the creator by metadata.creator_id and use their webhook secret.
// 2. Insert a row into `bids` (the immutable financial ledger).
// 3. Re-rank the top 10 bids by amount_paid for this creator.
// 4. Upsert all 10 positions into `podium_spots`. Fans outside the top 10 are
//    displaced — their podium_spots row is deleted, but their bids row remains.
//    NO REFUND is issued to displaced fans.
// 5. Return 200 so Stripe doesn't retry.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getCreatorStripe } from '@/lib/stripe';
import type { CheckoutMetadata } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // --- Step 1: Parse the raw event to extract metadata.creator_id ---
  // We need the creator_id to look up their webhook secret for verification.
  // Parse the unverified payload first, then verify with the correct secret.
  let rawEvent: Stripe.Event;
  try {
    rawEvent = JSON.parse(body) as Stripe.Event;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle payment_intent.succeeded
  if (rawEvent.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true });
  }

  const rawPaymentIntent = rawEvent.data.object as Stripe.PaymentIntent;
  const metadata = rawPaymentIntent.metadata as unknown as CheckoutMetadata;

  if (!metadata?.creator_id) {
    return NextResponse.json({ error: 'Missing creator_id in metadata' }, { status: 400 });
  }

  // --- Step 2: Fetch the creator's webhook secret and verify signature ---
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('id, stripe_secret_key, stripe_webhook_secret')
    .eq('id', metadata.creator_id)
    .single();

  if (creatorError || !creator) {
    console.error('Creator not found for webhook:', metadata.creator_id);
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Verify the signature with the creator's own webhook secret
  const creatorStripe = getCreatorStripe(creator.stripe_secret_key);
  let verifiedEvent: Stripe.Event;
  try {
    verifiedEvent = creatorStripe.webhooks.constructEvent(
      body,
      sig,
      creator.stripe_webhook_secret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const paymentIntent = verifiedEvent.data.object as Stripe.PaymentIntent;
  const verifiedMetadata = paymentIntent.metadata as unknown as CheckoutMetadata;

  const amountCents = parseInt(verifiedMetadata.amount_cents, 10);
  const fanHandle = verifiedMetadata.fan_handle;
  const fanAvatarUrl = verifiedMetadata.fan_avatar_url || null;
  const message = verifiedMetadata.message || null;
  const creatorId = verifiedMetadata.creator_id;
  const paymentIntentId = paymentIntent.id;

  // --- Step 3: Insert into bids table (permanent financial ledger) ---
  // This row is NEVER deleted — it's the audit trail for every payment.
  const { error: bidInsertError } = await supabaseAdmin
    .from('bids')
    .insert({
      creator_id: creatorId,
      fan_handle: fanHandle,
      fan_avatar_url: fanAvatarUrl,
      message,
      amount_paid: amountCents,
      stripe_payment_intent_id: paymentIntentId,
    });

  if (bidInsertError) {
    // If it's a duplicate (same payment_intent_id), Stripe is retrying — that's OK
    if (bidInsertError.code === '23505') {
      console.log('Duplicate bid ignored (Stripe retry):', paymentIntentId);
      return NextResponse.json({ received: true });
    }
    console.error('Failed to insert bid:', bidInsertError);
    return NextResponse.json({ error: 'Failed to record bid' }, { status: 500 });
  }

  // --- Step 4: Re-rank top 10 and upsert podium_spots ---
  // Fetch the top 10 bids by amount_paid (descending) for this creator.
  // Position is determined purely by rank: highest amount = position 1 (King).
  const { data: topBids, error: fetchError } = await supabaseAdmin
    .from('bids')
    .select('*')
    .eq('creator_id', creatorId)
    .order('amount_paid', { ascending: false })
    .limit(10);

  if (fetchError || !topBids) {
    console.error('Failed to fetch top bids:', fetchError);
    return NextResponse.json({ error: 'Failed to re-rank' }, { status: 500 });
  }

  // Clear existing podium_spots for this creator and rebuild from the top 10.
  // This is atomic: delete + insert in sequence ensures no stale positions.
  const { error: deleteError } = await supabaseAdmin
    .from('podium_spots')
    .delete()
    .eq('creator_id', creatorId);

  if (deleteError) {
    console.error('Failed to clear podium_spots:', deleteError);
    return NextResponse.json({ error: 'Failed to update podium' }, { status: 500 });
  }

  // Insert the new top 10 with their ranked positions
  const podiumRows = topBids.map((bid, index) => ({
    creator_id: creatorId,
    position: index + 1, // 1 = King, 2 = Runner-up, ..., 10 = last on board
    fan_handle: bid.fan_handle,
    fan_avatar_url: bid.fan_avatar_url,
    message: bid.message,
    amount_paid: bid.amount_paid,
    stripe_payment_intent_id: bid.stripe_payment_intent_id,
  }));

  if (podiumRows.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('podium_spots')
      .insert(podiumRows);

    if (insertError) {
      console.error('Failed to insert podium_spots:', insertError);
      return NextResponse.json({ error: 'Failed to update podium' }, { status: 500 });
    }
  }

  console.log(
    `Bid processed: ${fanHandle} paid $${(amountCents / 100).toFixed(2)} for ${creatorId}`
  );

  return NextResponse.json({ received: true });
}
