'use client';

// BidButton.tsx — triggers the Stripe checkout flow for a specific spot.
//
// BIDDING WAR NOTE:
// The button shows the MINIMUM required bid (current holder's amount + $1).
// On click, it calls /api/checkout which creates a Stripe Checkout Session
// scoped to the creator's own Stripe account. The fan is redirected to
// Stripe's hosted page to complete payment. On success, the Stripe webhook
// (/api/webhook/stripe) finalises the spot swap.

interface BidButtonProps {
  creatorSlug: string;
  position: number;
  minimumBidCents: number; // Must exceed current holder's amount_paid
  disabled?: boolean;
}

export default function BidButton({
  creatorSlug,
  position,
  minimumBidCents,
  disabled = false,
}: BidButtonProps) {
  // TODO: implement checkout redirect with loading state
  return (
    <button disabled={disabled} data-testid={`bid-button-${position}`}>
      {/* BidButton UI — scaffold only */}
    </button>
  );
}
