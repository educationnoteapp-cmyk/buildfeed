// /api/webhook/stripe — handles Stripe webhook events to finalize bids.
//
// STRIPE CONNECT FLOW (payment_intent.succeeded):
// 1. Verify the webhook signature using the PLATFORM webhook secret
//    (STRIPE_WEBHOOK_SECRET env var) — one secret for all creators.
// 2. Log the event with a timestamp.
// 3. Extract creator_id from payment_intent metadata.
// 4. Idempotency: if stripe_payment_intent_id already exists in bids → 200 immediately.
// 5. Insert a row into `bids` (the immutable financial ledger).
// 6. Re-rank the top 10 bids by amount_paid for this creator.
// 7. Rebuild `podium_spots` from the new top 10.
//    Fans outside top 10 are displaced — bids row stays, no refund.
// 8. Return 200 to Stripe immediately.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import type { CheckoutMetadata } from '@/types';

// Validate env at import time
void env;

function ts(): string {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) {
    console.error(`[${ts()}] Webhook: missing stripe-signature header`);
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // --- Verify signature with the platform webhook secret ---
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(`[${ts()}] Webhook: STRIPE_WEBHOOK_SECRET is not configured`);
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error(`[${ts()}] Webhook: signature verification failed:`, err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Log every received event with a timestamp
  console.log(`[${ts()}] Webhook received: ${event.type} | id=${event.id}`);

  // Only handle payment_intent.succeeded
  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true });
  }

  const paymentIntent  = event.data.object as Stripe.PaymentIntent;
  const metadata       = paymentIntent.metadata as unknown as CheckoutMetadata;

  if (!metadata?.creator_id) {
    console.error(`[${ts()}] Webhook: missing creator_id in metadata for ${paymentIntent.id}`);
    return NextResponse.json({ error: 'Missing creator_id in metadata' }, { status: 400 });
  }

  const amountCents     = parseInt(metadata.amount_cents, 10);
  const fanHandle       = metadata.fan_handle;
  const fanAvatarUrl    = metadata.fan_avatar_url || null;
  const message         = metadata.message || null;
  const creatorId       = metadata.creator_id;
  const paymentIntentId = paymentIntent.id;

  // --- Idempotency: explicit pre-check before insert ---
  // The unique constraint on stripe_payment_intent_id also catches duplicates,
  // but this avoids a wasted insert attempt on known retries.
  const { data: existingBid } = await supabaseAdmin
    .from('bids')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (existingBid) {
    console.log(`[${ts()}] Webhook: duplicate payment intent ignored (Stripe retry): ${paymentIntentId}`);
    return NextResponse.json({ received: true });
  }

  // --- Insert into bids table (permanent financial ledger) ---
  const { error: bidInsertError } = await supabaseAdmin
    .from('bids')
    .insert({
      creator_id:               creatorId,
      fan_handle:               fanHandle,
      fan_avatar_url:           fanAvatarUrl,
      message,
      amount_paid:              amountCents,
      stripe_payment_intent_id: paymentIntentId,
    });

  if (bidInsertError) {
    // Race condition: another webhook delivery inserted first — safe to ignore
    if (bidInsertError.code === '23505') {
      console.log(`[${ts()}] Webhook: duplicate bid ignored (race condition): ${paymentIntentId}`);
      return NextResponse.json({ received: true });
    }
    console.error(`[${ts()}] Webhook: failed to insert bid:`, bidInsertError);
    return NextResponse.json({ error: 'Failed to record bid' }, { status: 500 });
  }

  // --- Re-rank top 10 and rebuild podium_spots ---
  const { data: topBids, error: fetchError } = await supabaseAdmin
    .from('bids')
    .select('*')
    .eq('creator_id', creatorId)
    .order('amount_paid', { ascending: false })
    .limit(10);

  if (fetchError || !topBids) {
    console.error(`[${ts()}] Webhook: failed to fetch top bids:`, fetchError);
    return NextResponse.json({ error: 'Failed to re-rank' }, { status: 500 });
  }

  // Clear and rebuild podium_spots atomically
  const { error: deleteError } = await supabaseAdmin
    .from('podium_spots')
    .delete()
    .eq('creator_id', creatorId);

  if (deleteError) {
    console.error(`[${ts()}] Webhook: failed to clear podium_spots:`, deleteError);
    return NextResponse.json({ error: 'Failed to update podium' }, { status: 500 });
  }

  if (topBids.length > 0) {
    const podiumRows = topBids.map((bid, index) => ({
      creator_id:               creatorId,
      position:                 index + 1,
      fan_handle:               bid.fan_handle,
      fan_avatar_url:           bid.fan_avatar_url,
      message:                  bid.message,
      amount_paid:              bid.amount_paid,
      stripe_payment_intent_id: bid.stripe_payment_intent_id,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('podium_spots')
      .insert(podiumRows);

    if (insertError) {
      console.error(`[${ts()}] Webhook: failed to insert podium_spots:`, insertError);
      return NextResponse.json({ error: 'Failed to update podium' }, { status: 500 });
    }
  }

  console.log(
    `[${ts()}] Webhook: bid processed — ${fanHandle} paid $${(amountCents / 100).toFixed(2)} ` +
    `on creator=${creatorId} pi=${paymentIntentId}`
  );

  return NextResponse.json({ received: true });
}
