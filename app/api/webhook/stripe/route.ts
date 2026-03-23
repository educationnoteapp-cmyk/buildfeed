// /api/webhook/stripe — handles Stripe webhook events to finalise spot swaps.
//
// BIDDING WAR FLOW (on checkout.session.completed):
// 1. Verify the webhook signature using the creator's stripe_webhook_secret.
// 2. Extract metadata: creator_id, target_position, fan_handle, message, etc.
// 3. Re-validate that the paid amount still exceeds the current holder's bid.
//    (Race condition: two fans may try to outbid simultaneously — last write wins.)
// 4. Upsert the podium_spots row for (creator_id, position).
//    The previous holder's row is overwritten — they lose their spot, NO REFUND.
// 5. (Optional) Notify the displaced fan via email/push that they were outbid.

import { NextRequest, NextResponse } from 'next/server';

// Stripe requires the raw body to verify webhook signatures.
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  // TODO: implement Stripe webhook handler
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  // Signature verification and event processing goes here.

  return NextResponse.json({ received: true });
}
