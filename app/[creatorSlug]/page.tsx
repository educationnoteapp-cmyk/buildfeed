// /[creatorSlug] — public podium page for a creator.
//
// This is the page fans visit to see the leaderboard and place bids.
// Data is fetched server-side for fast initial load and SEO.

import { supabase } from '@/lib/supabase';
import type { PodiumSpot } from '@/types';

interface Props {
  params: { creatorSlug: string };
}

export default async function CreatorPodiumPage({ params }: Props) {
  const { creatorSlug } = params;

  // TODO: fetch creator + podium spots, render Podium + Leaderboard components

  return (
    <main>
      {/* Public podium page — scaffold only */}
      <h1>{creatorSlug}&apos;s Podium</h1>
    </main>
  );
}
