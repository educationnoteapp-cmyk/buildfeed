'use client';

// BidButton.tsx — Dynamic bidding panel where fans enter a free amount.
//
// BIDDING WAR LOGIC:
// - Fan enters any dollar amount they want to bid.
// - Minimum entry: $5, or (current #10's amount + $1) if the board is full.
// - The system auto-places the fan at the correct position based on amount rank.
// - Highest bid = #1 (King), lowest on-board bid = #10.
// - Flow: validate amount → /api/moderate (check message) → /api/checkout (Stripe session).

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Bid, ModerationResult } from '@/types';

const ABSOLUTE_MINIMUM_CENTS = 500; // $5 minimum always

interface BidButtonProps {
  creatorSlug: string;
  currentSpots: (Bid | null)[]; // All 10 spots, sorted by rank
  disabled?: boolean;
}

export default function BidButton({ creatorSlug, currentSpots, disabled = false }: BidButtonProps) {
  const [fanHandle, setFanHandle] = useState('');
  const [message, setMessage] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Calculate the minimum bid: max($5, current #10 amount + $1)
  const minimumBidCents = useMemo(() => {
    // Find the lowest occupied spot (the #10 or last occupied position)
    const occupiedSpots = currentSpots.filter((s): s is Bid => s !== null);
    if (occupiedSpots.length < 10) {
      // Board isn't full yet — minimum is $5
      return ABSOLUTE_MINIMUM_CENTS;
    }
    // Board is full — must outbid #10 (last spot) by at least $1
    const lowestBid = occupiedSpots[occupiedSpots.length - 1];
    return Math.max(ABSOLUTE_MINIMUM_CENTS, lowestBid.amount_paid + 100);
  }, [currentSpots]);

  const minimumBidDollars = (minimumBidCents / 100).toFixed(0);

  // Calculate which position the fan would land at
  const projectedPosition = useMemo(() => {
    const cents = Math.round(parseFloat(amountDollars || '0') * 100);
    if (cents < minimumBidCents) return null;
    const occupiedSpots = currentSpots.filter((s): s is Bid => s !== null);
    // Position = 1 + count of existing bids higher than this one
    const higherCount = occupiedSpots.filter((s) => s.amount_paid >= cents).length;
    return Math.min(higherCount + 1, 10);
  }, [amountDollars, currentSpots, minimumBidCents]);

  const positionLabel = (pos: number) => {
    if (pos === 1) return 'KING';
    if (pos === 2) return 'Runner-up';
    if (pos === 3) return 'Jester';
    return `#${pos}`;
  };

  const handleSubmit = async () => {
    setError(null);
    const cents = Math.round(parseFloat(amountDollars) * 100);

    // Validate
    if (!fanHandle.trim()) {
      setError('Enter your handle');
      return;
    }
    if (isNaN(cents) || cents < minimumBidCents) {
      setError(`Minimum bid is $${minimumBidDollars}`);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Moderate the message (if provided)
      if (message.trim()) {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message.trim() }),
        });
        const modData: ModerationResult = await modRes.json();
        if (!modData.allowed) {
          setError(modData.reason || 'Message not allowed');
          setLoading(false);
          return;
        }
      }

      // Step 2: Create Stripe checkout session
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorSlug,
          amountCents: cents,
          fanHandle: fanHandle.trim(),
          message: message.trim() || undefined,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        setError(checkoutData.error || 'Failed to create checkout session');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 mt-8 mb-12">
      {/* Toggle Button */}
      {!isOpen ? (
        <motion.button
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white
                     bg-gradient-to-r from-primary to-secondary
                     hover:shadow-[0_0_30px_rgba(79,70,229,0.4)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-shadow"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Claim Your Spot — from ${minimumBidDollars}
        </motion.button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className="bg-surface border border-border rounded-2xl p-6 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-main">Place Your Bid</h3>
              <button
                onClick={() => { setIsOpen(false); setError(null); }}
                className="text-muted hover:text-text-main transition-colors text-sm"
              >
                Cancel
              </button>
            </div>

            {/* Minimum entry info */}
            <div className="bg-background/60 rounded-xl px-4 py-3 border border-border/50">
              <span className="text-xs text-muted">Minimum entry:</span>
              <span className="text-sm font-bold text-primary ml-2">${minimumBidDollars}</span>
              <span className="text-xs text-muted ml-1">
                {currentSpots.filter(Boolean).length >= 10
                  ? '(current #10 + $1)'
                  : '(board has open spots)'}
              </span>
            </div>

            {/* Handle input */}
            <div>
              <label className="text-xs text-muted mb-1 block">Your Handle</label>
              <input
                type="text"
                value={fanHandle}
                onChange={(e) => setFanHandle(e.target.value)}
                placeholder="@yourname"
                maxLength={30}
                className="w-full bg-background border border-border rounded-xl px-4 py-3
                           text-text-main placeholder:text-muted/50 text-sm
                           focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Message input */}
            <div>
              <label className="text-xs text-muted mb-1 block">Message (optional)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Shoutout to the creator!"
                maxLength={100}
                className="w-full bg-background border border-border rounded-xl px-4 py-3
                           text-text-main placeholder:text-muted/50 text-sm
                           focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-muted mb-1 block">Your Bid (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-lg">$</span>
                <input
                  type="number"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  placeholder={minimumBidDollars}
                  min={parseInt(minimumBidDollars)}
                  step="1"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3
                             text-text-main text-lg font-bold
                             focus:outline-none focus:border-primary transition-colors
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                             [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Projected position preview */}
            <AnimatePresence mode="wait">
              {projectedPosition && (
                <motion.div
                  key={projectedPosition}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-xl px-4 py-3 text-center border ${
                    projectedPosition <= 3
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-primary/10 border-primary/30'
                  }`}
                >
                  <span className="text-xs text-muted">You would land at</span>
                  <span className={`text-lg font-bold ml-2 ${
                    projectedPosition === 1 ? 'text-yellow-400' : 'text-primary'
                  }`}>
                    {positionLabel(projectedPosition)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm text-center bg-red-500/10 rounded-xl px-4 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              onClick={handleSubmit}
              disabled={loading || disabled}
              className="w-full py-4 rounded-xl font-bold text-white
                         bg-gradient-to-r from-primary to-secondary
                         hover:shadow-[0_0_24px_rgba(79,70,229,0.35)]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-shadow text-base"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                'Pay & Claim Spot'
              )}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
