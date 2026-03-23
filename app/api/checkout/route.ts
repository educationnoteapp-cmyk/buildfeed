// /api/checkout — creates a Stripe Checkout Session for a podium bid.
//
// BIDDING WAR FLOW:
// 1. Receive the target position and fan details from the client.
// 2. Fetch the creator's Stripe secret key from Supabase.
// 3. Look up the current occupant of the target position.
// 4. Validate that the fan's bid exceeds the current holder's amount_paid.
// 5. Run the fan's message through OpenAI moderation (/api/moderate).
// 6. Create a Stripe Checkout Session with metadata so the webhook can
//    finalise the spot swap after successful payment.
// 7. Return the session URL to redirect the fan to Stripe's hosted page.

import { NextRequest, NextResponse } from 'next/server';
import type { CheckoutPayload } from '@/types';

export async function POST(req: NextRequest) {
  // TODO: implement checkout session creation
  const body: CheckoutPayload = await req.json();

  return NextResponse.json({ url: null }, { status: 501 });
}
