'use client';

// Podium.tsx — The top 3 spots: King (#1), Runner-up (#2), Jester (#3).
//
// BIDDING WAR: Position is determined by amount_paid rank.
// Highest bid = King (#1). The crown glows and confetti bursts when a new King
// is crowned (detected via key change on the #1 spot).

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Bid } from '@/types';

// --- Confetti Particle System (lightweight, no tsparticles dep for SSR safety) ---
// We use tsparticles via dynamic import to avoid SSR issues.

interface ConfettiCanvasProps {
  fire: boolean;
  onDone: () => void;
}

function ConfettiCanvas({ fire, onDone }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#FFD700', '#FF6B6B', '#4F46E5', '#7C3AED', '#059669', '#F59E0B'];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; rotation: number; spin: number; life: number;
    }[] = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 4,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.vy += 0.25; // gravity
        p.y += p.vy;
        p.rotation += p.spin;
        p.life -= 0.012;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive) {
        animId = requestAnimationFrame(animate);
      } else {
        onDone();
      }
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [fire, onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    />
  );
}

// --- Crown SVG ---
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.97 10l-2.2-6.6a1.5 1.5 0 0 0-2.84.08L7.8 10.02l-5.13-1.38c-.8-.22-1.64.26-1.85 1.06-.1.4-.02.82.23 1.14l5.4 6.9h11.28l5.12-6.86c.26-.33.35-.76.22-1.14z" />
    </svg>
  );
}

// --- Spot labels ---
const SPOT_LABELS: Record<number, { title: string; emoji: string }> = {
  1: { title: 'KING', emoji: '' },
  2: { title: 'RUNNER-UP', emoji: '' },
  3: { title: 'JESTER', emoji: '' },
};

// --- Spot Card ---
function SpotCard({
  bid,
  rank,
  onBid,
}: {
  bid: Bid | null;
  rank: 1 | 2 | 3;
  onBid: (currentAmount: number) => void;
}) {
  const isKing = rank === 1;
  const label = SPOT_LABELS[rank];

  // Visual heights for the podium columns: King tallest, Runner-up second, Jester third
  const heightClass = isKing ? 'h-64' : rank === 2 ? 'h-52' : 'h-44';
  const orderClass = rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3';

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  return (
    <motion.div
      layout
      className={`flex flex-col items-center ${orderClass} flex-1 max-w-[200px]`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: rank * 0.1 }}
    >
      {/* Avatar + Crown */}
      <div className="relative mb-3">
        {isKing && (
          <motion.div
            className="absolute -top-7 left-1/2 -translate-x-1/2 z-10"
            animate={{
              filter: [
                'drop-shadow(0 0 6px #FFD700)',
                'drop-shadow(0 0 16px #FFD700)',
                'drop-shadow(0 0 6px #FFD700)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CrownIcon className="w-10 h-10 text-yellow-400" />
          </motion.div>
        )}
        <motion.div
          className={`rounded-full overflow-hidden border-2 ${
            isKing
              ? 'w-20 h-20 border-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.4)]'
              : 'w-14 h-14 border-border'
          } bg-surface`}
          whileHover={{ scale: 1.08 }}
        >
          {bid?.fan_avatar_url ? (
            <img
              src={bid.fan_avatar_url}
              alt={bid.fan_handle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-muted ${isKing ? 'text-2xl' : 'text-lg'}`}>
              {bid ? bid.fan_handle.charAt(0).toUpperCase() : '?'}
            </div>
          )}
        </motion.div>
      </div>

      {/* Podium Column */}
      <motion.div
        className={`${heightClass} w-full rounded-t-xl flex flex-col items-center justify-start pt-4 px-2 relative overflow-hidden ${
          isKing
            ? 'bg-gradient-to-b from-yellow-500/20 to-surface border border-yellow-500/30'
            : 'bg-gradient-to-b from-primary/10 to-surface border border-border'
        }`}
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.3 + rank * 0.1 }}
      >
        {/* Glow effect for King */}
        {isKing && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        <span className={`text-xs font-bold tracking-widest mb-1 ${isKing ? 'text-yellow-400' : 'text-muted'}`}>
          #{rank} {label.title}
        </span>

        {bid ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={bid.id}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className="text-sm font-semibold text-text-main truncate max-w-full">
                {bid.fan_handle}
              </span>
              <span className={`text-lg font-bold mt-1 ${isKing ? 'text-yellow-400' : 'text-primary'}`}>
                {formatAmount(bid.amount_paid)}
              </span>
              {bid.message && (
                <p className="text-xs text-muted mt-2 line-clamp-2 italic">
                  &ldquo;{bid.message}&rdquo;
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-1 mt-2"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-muted text-sm">Empty</span>
            <span className="text-xs text-muted">Be the first!</span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- Main Podium Component ---
interface PodiumProps {
  spots: (Bid | null)[];  // Index 0 = rank 1, index 1 = rank 2, index 2 = rank 3
  onBid: (currentAmount: number) => void;
}

export default function Podium({ spots, onBid }: PodiumProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const prevKingRef = useRef<string | null>(null);

  // Fire confetti when a NEW King is crowned
  const currentKingId = spots[0]?.id ?? null;
  useEffect(() => {
    if (prevKingRef.current !== null && currentKingId !== prevKingRef.current && currentKingId !== null) {
      setShowConfetti(true);
    }
    prevKingRef.current = currentKingId;
  }, [currentKingId]);

  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);

  return (
    <div className="relative w-full max-w-lg mx-auto px-4 pt-12 pb-4">
      {/* Confetti overlay */}
      <ConfettiCanvas fire={showConfetti} onDone={handleConfettiDone} />

      {/* Title */}
      <motion.h2
        className="text-center text-xl font-bold text-text-main mb-8 tracking-wide"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        THE PODIUM
      </motion.h2>

      {/* 3-column podium: ordered as Runner-up | King | Jester visually */}
      <div className="flex items-end justify-center gap-3">
        <SpotCard bid={spots[1] ?? null} rank={2} onBid={onBid} />
        <SpotCard bid={spots[0] ?? null} rank={1} onBid={onBid} />
        <SpotCard bid={spots[2] ?? null} rank={3} onBid={onBid} />
      </div>
    </div>
  );
}
