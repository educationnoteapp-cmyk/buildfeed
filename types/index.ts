// Core types for The Creator Podium bidding system.
//
// BIDDING WAR LOGIC:
// - The podium has 10 spots. Spots 1-3 are displayed prominently on the Podium.
// - Spots 4-10 are shown on the Leaderboard.
// - To claim any spot, a fan must pay MORE than the current holder.
// - The displaced fan loses their spot with NO REFUND.
// - If all 10 spots are full, bidding on spot #10 (the cheapest) kicks the
//   current holder out of the leaderboard entirely.

export interface Creator {
  id: string;
  slug: string;
  // Each creator has their own Stripe keys so payouts go directly to them.
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  created_at: string;
}

export interface PodiumSpot {
  id: string;
  creator_id: string;
  // Position 1 = top of podium (most expensive), 10 = bottom of leaderboard.
  position: number;
  fan_handle: string;
  fan_avatar_url: string | null;
  // The message shown on the leaderboard (e.g. "@handle says hi!").
  // This must pass OpenAI moderation before being saved.
  message: string | null;
  // Amount paid in cents (Stripe stores amounts in smallest currency unit).
  amount_paid: number;
  stripe_payment_intent_id: string;
  created_at: string;
}

// Payload sent from the checkout API to create a Stripe session.
export interface CheckoutPayload {
  creatorSlug: string;
  targetPosition: number; // Which spot the fan wants to claim
  fanHandle: string;
  fanAvatarUrl?: string;
  message?: string;
}

// Response from the /api/moderate endpoint.
export interface ModerationResult {
  allowed: boolean;
  reason?: string; // Human-readable reason if flagged
}

// Minimal shape of a Stripe checkout session metadata we attach.
export interface CheckoutMetadata {
  creator_id: string;
  target_position: string; // stored as string in Stripe metadata
  fan_handle: string;
  fan_avatar_url: string;
  message: string;
  // The minimum amount (in cents) this bid must exceed to be valid.
  minimum_bid: string;
}
