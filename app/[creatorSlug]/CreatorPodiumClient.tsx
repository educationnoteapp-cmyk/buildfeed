'use client';

// CreatorPodiumClient.tsx — Client wrapper that handles realtime subscriptions.
//
// REALTIME STRATEGY:
// We subscribe to the `bids` table (not podium_spots) because bids is the
// immutable financial ledger — every new payment triggers an INSERT here.
// On any new bid event, we re-fetch the top 10 highest bids by amount_paid
// and re-render the podium. This ensures rankings are always derived from
// the single source of truth (the bids table, ordered by amount).

import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Podium from '@/components/Podium';
import Leaderboard from '@/components/Leaderboard';
import BidButton from '@/components/BidButton';
import type { Creator, Bid } from '@/types';

interface Props {
  creator: Creator;
  initialBids: Bid[];
}

export default function CreatorPodiumClient({ creator, initialBids }: Props) {
  // Top 10 bids sorted descending by amount — index 0 = King (#1)
  const [bids, setBids] = useState<Bid[]>(initialBids);

  // Re-fetch top 10 bids from Supabase (called on initial load and on realtime events)
  const fetchBids = useCallback(async () => {
    const { data } = await supabaseBrowser
      .from('bids')
      .select('*')
      .eq('creator_id', creator.id)
      .order('amount_paid', { ascending: false })
      .limit(10);
    if (data) {
      setBids(data);
    }
  }, [creator.id]);

  // Subscribe to realtime INSERT events on the `bids` table for this creator.
  // When any new bid comes in, re-fetch the full top-10 to get correct rankings.
  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`bids:creator:${creator.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `creator_id=eq.${creator.id}`,
        },
        () => {
          // Don't use the payload directly — re-fetch to get proper top-10 ordering.
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [creator.id, fetchBids]);

  // Pad to 10 slots (some may be null if fewer than 10 bids exist)
  const allSlots: (Bid | null)[] = Array.from({ length: 10 }, (_, i) => bids[i] ?? null);
  const podiumSpots = allSlots.slice(0, 3);   // Ranks 1–3
  const leaderboardSpots = allSlots.slice(3);  // Ranks 4–10

  return (
    <div className="min-h-screen bg-background">
      {/* Creator Header */}
      <div className="pt-8 pb-4 text-center">
        <h1 className="text-2xl font-bold text-text-main">
          {creator.slug}&apos;s
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent ml-2">
            Ego Podium
          </span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Pay to claim your spot. Outbid to take the throne.
        </p>
      </div>

      {/* Podium — top 3 */}
      <Podium
        spots={podiumSpots}
        onBid={() => {}}
      />

      {/* Leaderboard — spots 4–10 */}
      <Leaderboard
        spots={leaderboardSpots}
        onBid={() => {}}
      />

      {/* Bid Panel */}
      <BidButton
        creatorSlug={creator.slug}
        currentSpots={allSlots}
      />

      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2 pb-8">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted">Live updates</span>
      </div>
    </div>
  );
}
