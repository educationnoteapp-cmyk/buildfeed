'use client';

// Leaderboard.tsx — displays spots 4–10 below the Podium.
//
// BIDDING WAR NOTE:
// Spot #10 is the "entry" slot — the cheapest position on the board.
// When all 10 spots are occupied, a new fan must outbid the current #10
// holder to get on the board. That person is then ejected with no refund.

import type { PodiumSpot } from '@/types';

interface LeaderboardProps {
  spots: PodiumSpot[]; // Pre-filtered to positions 4–10
  onBid: (position: number, currentAmount: number) => void;
}

export default function Leaderboard({ spots, onBid }: LeaderboardProps) {
  // TODO: implement ranked list UI with animations
  return (
    <div data-testid="leaderboard">
      {/* Leaderboard UI — scaffold only */}
    </div>
  );
}
