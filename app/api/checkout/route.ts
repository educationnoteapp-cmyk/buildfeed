// /api/checkout — creates a Stripe Checkout Session for a podium bid.
//
// BIDDING WAR FLOW:
// 1. Receive { creatorSlug, fanHandle, message, amountCents } from the client.
// 2. Fetch the creator's stripe_secret_key from Supabase (each creator has their own).
// 3. Validate the bid amount meets the minimum ($5, or current #10 + $1 if board is full).
// 4. Create a Stripe Checkout Session using the CREATOR'S Stripe key so the payment
//    goes directly to the creator's account. Metadata is attached so the webhook
//    can finalize the spot swap after payment succeeds.
// 5. Return the checkout URL for client-side redirect.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getCreatorStripe } from '@/lib/stripe';
import type { CheckoutPayload, CheckoutMetadata } from '@/types';

const ABSOLUTE_MINIMUM_CENTS = 500; // $5

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutPayload = await req.json();
    const { creatorSlug, fanHandle, message, amountCents, fanAvatarUrl } = body;

    // --- Validate input ---
    if (!creatorSlug || !fanHandle || !amountCents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Fetch creator ---
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('id, slug, stripe_secret_key, stripe_webhook_secret')
      .eq('slug', creatorSlug)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // --- Calculate minimum bid ---
    // Fetch current top 10 bids to determine if board is full and what #10 pays
    const { data: topBids } = await supabaseAdmin
      .from('bids')
      .select('amount_paid')
      .eq('creator_id', creator.id)
      .order('amount_paid', { ascending: false })
      .limit(10);

    let minimumBidCents = ABSOLUTE_MINIMUM_CENTS;
    if (topBids && topBids.length >= 10) {
      // Board is full — must outbid #10 by at least $1
      const lowestTopBid = topBids[topBids.length - 1].amount_paid;
      minimumBidCents = Math.max(ABSOLUTE_MINIMUM_CENTS, lowestTopBid + 100);
    }

    if (amountCents < minimumBidCents) {
      return NextResponse.json(
        { error: `Minimum bid is $${(minimumBidCents / 100).toFixed(0)}` },
        { status: 400 }
      );
    }

    // --- Create Stripe Checkout Session using the creator's own Stripe key ---
    const creatorStripe = getCreatorStripe(creator.stripe_secret_key);

    // Attach metadata so the webhook handler knows how to finalize the bid
    const metadata: CheckoutMetadata = {
      creator_id: creator.id,
      fan_handle: fanHandle,
      fan_avatar_url: fanAvatarUrl || '',
      message: message || '',
      amount_cents: String(amountCents),
    };

    // Build the success/cancel URLs relative to the request origin
    const origin = req.headers.get('origin') || req.nextUrl.origin;

    // Cast CheckoutMetadata to Stripe.MetadataParam (both are string-value records)
    const stripeMetadata = metadata as unknown as Stripe.MetadataParam;

    const session = await creatorStripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `Podium Bid — ${creator.slug}`,
              description: `Bid by ${fanHandle} for a spot on ${creator.slug}'s Ego Podium`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: stripeMetadata,
      success_url: `${origin}/${creator.slug}?bid=success`,
      cancel_url: `${origin}/${creator.slug}?bid=cancelled`,
      // Attach metadata to payment_intent so the webhook can finalize the bid
      payment_intent_data: {
        metadata: stripeMetadata,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
