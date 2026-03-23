'use client';

// Leaderboard.tsx — spots #4 through #10, displayed as a ranked list.
//
// BIDDING WAR: When someone new pays enough to enter the top 10,
// the current #10 holder gets knocked off with NO REFUND.
// A smooth exit animation plays for the displaced fan.

import { motion, AnimatePresence } from 'framer-motion';
import type { Bid } from '@/types';

interface LeaderboardProps {
  spots: (Bid | null)[]; // Index 0 = rank 4, through index 6 = rank 10
  onBid: (currentAmount: number) => void;
}

function formatAmount(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function LeaderboardRow({
  bid,
  rank,
}: {
  bid: Bid | null;
  rank: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
      className="flex items-center gap-3 py-3 px-4 rounded-xl bg-surface/60 border border-border/50
                 hover:border-primary/30 hover:bg-surface transition-all group"
    >
      {/* Position Badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background flex items-center justify-center
                      border border-border group-hover:border-primary/40 transition-colors">
        <span className="text-sm font-bold text-muted group-hover:text-primary transition-colors">
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-background border border-border">
        {bid?.fan_avatar_url ? (
          <img src={bid.fan_avatar_url} alt={bid.fan_handle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">
            {bid ? bid.fan_handle.charAt(0).toUpperCase() : '?'}
          </div>
        )}
      </div>

      {/* Handle + Message */}
      <div className="flex-1 min-w-0">
        {bid ? (
          <>
            <span className="text-sm font-semibold text-text-main block truncate">
              {bid.fan_handle}
            </span>
            {bid.message && (
              <p className="text-xs text-muted truncate italic mt-0.5">
                &ldquo;{bid.message}&rdquo;
              </p>
            )}
          </>
        ) : (
          <span className="text-sm text-muted">Empty spot</span>
        )}
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        {bid ? (
          <motion.span
            key={bid.amount_paid}
            className="text-sm font-bold text-primary"
            initial={{ scale: 1.3, color: '#059669' }}
            animate={{ scale: 1, color: '#4F46E5' }}
            transition={{ duration: 0.5 }}
          >
            {formatAmount(bid.amount_paid)}
          </motion.span>
        ) : (
          <span className="text-sm text-muted">--</span>
        )}
      </div>
    </motion.div>
  );
}

export default function Leaderboard({ spots, onBid }: LeaderboardProps) {
  return (
    <div className="w-full max-w-lg mx-auto px-4 mt-6">
      <h3 className="text-sm font-bold text-muted tracking-widest mb-3 px-1">
        LEADERBOARD
      </h3>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {Array.from({ length: 7 }, (_, i) => {
            const rank = i + 4; // ranks 4–10
            const bid = spots[i] ?? null;
            return (
              <LeaderboardRow
                key={bid?.id ?? `empty-${rank}`}
                bid={bid}
                rank={rank}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
