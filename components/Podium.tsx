'use client';

// Podium.tsx — displays the top 3 spots in a classic podium layout.
//
// BIDDING WAR NOTE:
// Positions are ordered 1 (center/tallest), 2 (left), 3 (right) visually,
// but stored as integers 1–3 in the DB. Position 1 is the most expensive
// spot; to claim it a fan must outbid the current holder.

import type { PodiumSpot } from '@/types';

interface PodiumProps {
  spots: PodiumSpot[]; // Pre-filtered to positions 1–3
  onBid: (position: number, currentAmount: number) => void;
}

export default function Podium({ spots, onBid }: PodiumProps) {
  // TODO: implement animated 3-column podium UI with Framer Motion
  return (
    <div data-testid="podium">
      {/* Podium UI — scaffold only */}
    </div>
  );
}
