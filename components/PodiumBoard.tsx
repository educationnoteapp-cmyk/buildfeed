"use client";

// PodiumBoard.tsx — Main leaderboard with spring-physics positions + dopamine ceremonies.
//
// Animation 4 — Crowning Ceremony:
//   When bids[0].id changes (new King), a bg-black/85 overlay drops over the
//   entire screen for 1.5 s. The KingSpot sits at z-[100] ABOVE the overlay,
//   acting as a spotlight. Its glow intensifies during this window.
//
// Animation 5 — Confetti Explosion:
//   Fires simultaneously with the overlay. 180 gold/white particles burst
//   outward from the center, slow via decay, and fade via opacity animation.
//   Unmounts itself after 3 s.
//
// Animation 6 — Rolling Numbers:
//   All amounts (King, Runner-up, Jester, rows 4–10) use <RollingNumber>
//   so every dollar figure counts up smoothly on every change.

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, ISourceOptions } from "@tsparticles/engine";
import KingSpot from "./KingSpot";
import RollingNumber from "./RollingNumber";

// ---- Types ----
interface Bid {
  id: string;
  fanHandle: string;
  fanAvatarUrl: string;
  message: string;
  amountPaid: number;
}

interface PodiumBoardProps {
  bids: Bid[];
}

const SPRING = { type: "spring" as const, stiffness: 350, damping: 28 };

// ---- Confetti explosion (Animation 5) ----
// Mounts a full-screen tsParticles canvas at z-[200] for 3 seconds.
const CONFETTI_OPTIONS: ISourceOptions = {
  fullScreen: { enable: false },
  fpsLimit: 60,
  background: { color: { value: "transparent" } },
  particles: {
    number: { value: 180, density: { enable: false } },
    color: { value: ["#FFD700", "#FFA500", "#FF8C00", "#FFFFFF", "#FFF8DC", "#7C3AED", "#EC4899"] },
    shape: { type: "circle" },
    opacity: {
      value: { min: 0, max: 1 },
      animation: {
        enable: true,
        speed: 1.2,
        sync: false,
        // Particles fade from full opacity down to 0 then self-destruct
        startValue: "max" as "max",
        destroy: "min" as "min",
      },
    },
    size: { value: { min: 3, max: 9 } },
    move: {
      enable: true,
      speed: { min: 6, max: 20 },
      direction: "none" as const,
      random: true,
      straight: false,
      outModes: { default: "destroy" as const },
      decay: 0.04, // gradual natural deceleration
    },
  },
  detectRetina: true,
};

function CrownConfetti({ onDone }: { onDone: () => void }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Engine is likely already initialized by BackgroundArena; this is idempotent
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));

    // Auto-dismiss after 3 s
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!ready) return null;

  return (
    <Particles
      id="crown-confetti"
      options={CONFETTI_OPTIONS}
      className="fixed inset-0 z-[200] pointer-events-none w-full h-full"
    />
  );
}

// ---- Avatar with initials fallback ----
function AvatarOrInitial({
  url,
  handle,
  size = "md",
}: {
  url: string;
  handle: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "w-16 h-16" : size === "md" ? "w-12 h-12" : "w-9 h-9";
  const text = size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-sm";

  if (url) {
    return (
      <img
        src={url}
        alt={handle}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0`}>
      <span className={`${text} font-bold text-slate-300`}>
        {handle.replace(/^@/, "").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ---- Runner-up (#2) ----
function RunnerUpCard({ bid }: { bid: Bid }) {
  return (
    <motion.div layout layoutId={bid.id} transition={SPRING} className="flex flex-col items-center gap-2">
      <div className="relative">
        <AvatarOrInitial url={bid.fanAvatarUrl} handle={bid.fanHandle} size="md" />
        <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(192,192,192,0.5)] pointer-events-none" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-bold text-sm">
          {bid.fanHandle.startsWith("@") ? bid.fanHandle : `@${bid.fanHandle}`}
        </p>
        <RollingNumber value={bid.amountPaid} className="text-slate-400 text-xs font-medium mt-0.5 block" />
        <span className="text-xs text-slate-500 mt-0.5 block tracking-widest">#2</span>
      </div>
    </motion.div>
  );
}

// ---- Jester (#3) ----
function JesterCard({ bid }: { bid: Bid }) {
  return (
    <motion.div layout layoutId={bid.id} transition={SPRING} className="flex flex-col items-center gap-2">
      <div className="relative">
        <AvatarOrInitial url={bid.fanAvatarUrl} handle={bid.fanHandle} size="md" />
        <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(205,127,50,0.5)] pointer-events-none" />
      </div>
      <div className="text-center">
        <p className="text-amber-600 font-bold text-sm">
          {bid.fanHandle.startsWith("@") ? bid.fanHandle : `@${bid.fanHandle}`}
        </p>
        <RollingNumber value={bid.amountPaid} className="text-slate-400 text-xs font-medium mt-0.5 block" />
        <span className="text-xs text-slate-500 mt-0.5 block tracking-widest">#3</span>
      </div>
    </motion.div>
  );
}

// ---- Leaderboard row (#4–10) ----
function LeaderRow({ bid, rank }: { bid: Bid; rank: number }) {
  const isEven = rank % 2 === 0;
  return (
    <motion.div
      layout
      layoutId={bid.id}
      transition={SPRING}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl
                  ${isEven ? "bg-slate-900" : "bg-slate-800/60"}`}
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
        <span className="text-xs font-extrabold text-slate-400">{rank}</span>
      </div>
      <AvatarOrInitial url={bid.fanAvatarUrl} handle={bid.fanHandle} size="sm" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-slate-200 block truncate">
          {bid.fanHandle.startsWith("@") ? bid.fanHandle : `@${bid.fanHandle}`}
        </span>
        {bid.message && (
          <p className="text-xs text-slate-500 truncate italic mt-0.5">
            &ldquo;{bid.message}&rdquo;
          </p>
        )}
      </div>
      <RollingNumber value={bid.amountPaid} className="text-sm font-extrabold text-indigo-400 flex-shrink-0" />
    </motion.div>
  );
}

// ---- Empty slot ----
function EmptySlot({ rank }: { rank: number }) {
  return (
    <motion.div
      layout
      key={`empty-${rank}`}
      transition={SPRING}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/40 border border-dashed border-slate-800"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
        <span className="text-xs font-extrabold text-slate-600">{rank}</span>
      </div>
      <span className="text-xs text-slate-600 italic">Empty — bid to claim!</span>
    </motion.div>
  );
}

// ---- Main PodiumBoard ----
export default function PodiumBoard({ bids }: PodiumBoardProps) {
  const king = bids[0] ?? null;
  const runnerUp = bids[1] ?? null;
  const jester = bids[2] ?? null;
  const rest = bids.slice(3);

  // Track previous king to detect throne changes
  const prevKingIdRef = useRef<string | null>(null);

  // Animation 4: overlay active for 1.5 s
  const [crowning, setCrowning] = useState(false);
  // Animation 5: confetti active for 3 s
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const newKingId = king?.id ?? null;
    // Only fire if a previous king existed and the id actually changed
    if (
      prevKingIdRef.current !== null &&
      newKingId !== null &&
      newKingId !== prevKingIdRef.current
    ) {
      setCrowning(true);
      setShowConfetti(true);
      const t = setTimeout(() => setCrowning(false), 1500);
      return () => clearTimeout(t);
    }
    prevKingIdRef.current = newKingId;
  }, [king?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);

  return (
    <>
      {/* ---- Animation 4: Spotlight overlay (fixed, behind king z-[100]) ---- */}
      <AnimatePresence>
        {crowning && (
          <motion.div
            key="crown-overlay"
            className="fixed inset-0 z-[90] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          />
        )}
      </AnimatePresence>

      {/* ---- Animation 5: Confetti burst ---- */}
      {showConfetti && <CrownConfetti onDone={handleConfettiDone} />}

      {/* ---- Main board ---- */}
      <LayoutGroup id="podium">
        <div className="w-full max-w-lg mx-auto px-4 space-y-8">

          {/* TOP 3 */}
          <div className="flex items-end justify-center gap-8 pt-8">

            {/* Runner-up — left */}
            <div className="pb-4">
              {runnerUp ? (
                <RunnerUpCard bid={runnerUp} />
              ) : (
                <motion.div layout className="flex flex-col items-center gap-2 opacity-30">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700" />
                  <span className="text-xs text-slate-600 tracking-widest">#2</span>
                </motion.div>
              )}
            </div>

            {/* King — center, elevated above overlay during crowning ceremony */}
            <div className={`pb-0 transition-none ${crowning ? "relative z-[100]" : ""}`}>
              {king ? (
                <motion.div
                  layout
                  layoutId={king.id}
                  transition={SPRING}
                  className="flex flex-col items-center gap-2"
                >
                  {/* Extra outer glow amplified during ceremony */}
                  <motion.div
                    className="relative"
                    animate={
                      crowning
                        ? {
                            filter: [
                              "drop-shadow(0 0 30px rgba(255,215,0,0.8))",
                              "drop-shadow(0 0 60px rgba(255,215,0,1))",
                              "drop-shadow(0 0 30px rgba(255,215,0,0.8))",
                            ],
                          }
                        : { filter: "drop-shadow(0 0 16px rgba(255,215,0,0.5))" }
                    }
                    transition={
                      crowning
                        ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.4 }
                    }
                  >
                    <KingSpot
                      avatarUrl={king.fanAvatarUrl || ""}
                      fanHandle={king.fanHandle.replace(/^@/, "")}
                      amountPaid={king.amountPaid}
                      intense={crowning}
                    />
                  </motion.div>
                  <span className="text-xs text-yellow-600/60 tracking-widest mt-1">#1 KING</span>
                </motion.div>
              ) : (
                <motion.div layout className="flex flex-col items-center gap-2 opacity-30">
                  <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700" />
                  <span className="text-xs text-slate-600 tracking-widest">#1 KING</span>
                </motion.div>
              )}
            </div>

            {/* Jester — right */}
            <div className="pb-4">
              {jester ? (
                <JesterCard bid={jester} />
              ) : (
                <motion.div layout className="flex flex-col items-center gap-2 opacity-30">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700" />
                  <span className="text-xs text-slate-600 tracking-widest">#3</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* POSITIONS 4–10 */}
          {(rest.length > 0 || bids.length < 10) && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-slate-500 tracking-[0.2em] px-1 mb-3">
                LEADERBOARD
              </p>
              {Array.from({ length: 7 }, (_, i) => {
                const rank = i + 4;
                const bid = rest[i];
                return bid ? (
                  <LeaderRow key={bid.id} bid={bid} rank={rank} />
                ) : (
                  <EmptySlot key={`empty-${rank}`} rank={rank} />
                );
              })}
            </div>
          )}
        </div>
      </LayoutGroup>
    </>
  );
}
