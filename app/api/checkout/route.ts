// /api/checkout — creates a Stripe Checkout Session for a podium bid.
//
// STRIPE CONNECT FLOW:
// 1. Receive { creatorSlug, fanHandle, message, amountCents } from the client.
// 2. Fetch the creator's stripe_account_id from Supabase.
// 3. Validate bid amount meets the minimum.
// 4. Create a Checkout Session using the PLATFORM key with stripeAccount set to
//    the creator's connected account so the payment lands directly in their Stripe.
// 5. Apply platform application fee based on plan_type:
//      founding | trial → 0% fee
//      all others       → 15% fee
// 6. Return the checkout URL for client-side redirect.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import type { CheckoutPayload, CheckoutMetadata } from '@/types';

const ABSOLUTE_MINIMUM_CENTS = 500; // $5
const PLATFORM_FEE_PERCENT   = 0.15; // 15% for non-founding/non-trial plans

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutPayload = await req.json();
    const { creatorSlug, fanHandle, message, amountCents, fanAvatarUrl } = body;

    if (!creatorSlug || !fanHandle || !amountCents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Fetch creator ---
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('id, slug, stripe_account_id, plan_type')
      .eq('slug', creatorSlug)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // --- Ensure creator has connected Stripe ---
    if (!creator.stripe_account_id) {
      return NextResponse.json(
        { error: 'Creator has not connected their Stripe account yet' },
        { status: 402 }
      );
    }

    // --- Calculate minimum bid ---
    const { data: topBids } = await supabaseAdmin
      .from('bids')
      .select('amount_paid')
      .eq('creator_id', creator.id)
      .order('amount_paid', { ascending: false })
      .limit(10);

    let minimumBidCents = ABSOLUTE_MINIMUM_CENTS;
    if (topBids && topBids.length >= 10) {
      const lowestTopBid = topBids[topBids.length - 1].amount_paid;
      minimumBidCents = Math.max(ABSOLUTE_MINIMUM_CENTS, lowestTopBid + 100);
    }

    if (amountCents < minimumBidCents) {
      return NextResponse.json(
        { error: `Minimum bid is $${(minimumBidCents / 100).toFixed(0)}` },
        { status: 400 }
      );
    }

    // --- Application fee logic ---
    // founding and trial plans → 0% (reward early adopters)
    // all other plans          → 15% platform fee
    const isFeeExempt =
      creator.plan_type === 'founding' || creator.plan_type === 'trial';
    const applicationFeeAmount = isFeeExempt
      ? 0
      : Math.floor(amountCents * PLATFORM_FEE_PERCENT);

    // --- Build metadata ---
    const metadata: CheckoutMetadata = {
      creator_id:    creator.id,
      fan_handle:    fanHandle,
      fan_avatar_url: fanAvatarUrl || '',
      message:       message || '',
      amount_cents:  String(amountCents),
    };
    const stripeMetadata = metadata as unknown as Stripe.MetadataParam;

    const origin = req.headers.get('origin') || req.nextUrl.origin;

    // --- Create Stripe Checkout Session via Connect ---
    // The platform key is used but payment lands in the creator's connected account.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name:        `Podium Bid — ${creator.slug}`,
              description: `Bid by ${fanHandle} for a spot on ${creator.slug}'s Ego Podium`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: stripeMetadata,
      success_url: `${origin}/${creator.slug}?bid=success`,
      cancel_url:  `${origin}/${creator.slug}?bid=cancelled`,
      payment_intent_data: {
        metadata:        stripeMetadata,
        // Route payment to the creator's connected account
        transfer_data: {
          destination: creator.stripe_account_id,
        },
        // Collect platform fee (0 for founding/trial creators)
        ...(applicationFeeAmount > 0 && {
          application_fee_amount: applicationFeeAmount,
        }),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
