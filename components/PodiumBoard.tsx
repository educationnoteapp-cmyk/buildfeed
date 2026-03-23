"use client";

// PodiumBoard.tsx — Main leaderboard with spring-physics position transitions.
//
// All 10 spots. When array order changes (new bid pushes someone up/down),
// every card slides smoothly to its new position — no jumps, no pops.
// Uses Framer Motion LayoutGroup + layoutId per bid for shared-layout magic.

import { motion, LayoutGroup } from "framer-motion";
import KingSpot from "./KingSpot";

// ---- Bid type ----
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

// ---- Default avatar initials fallback ----
function AvatarOrInitial({
  url,
  handle,
  size = "md",
}: {
  url: string;
  handle: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "w-16 h-16" : size === "md" ? "w-12 h-12" : "w-9 h-9";
  const text =
    size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-sm";

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
    <div
      className={`${dim} rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0`}
    >
      <span className={`${text} font-bold text-slate-300`}>
        {handle.replace(/^@/, "").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

// ---- Position #2 card (Runner-up, left of King) ----
function RunnerUpCard({ bid }: { bid: Bid }) {
  return (
    <motion.div
      layout
      layoutId={bid.id}
      transition={SPRING}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <AvatarOrInitial url={bid.fanAvatarUrl} handle={bid.fanHandle} size="md" />
        {/* Silver ring glow */}
        <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(192,192,192,0.5)] pointer-events-none" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-bold text-sm">
          {bid.fanHandle.startsWith("@") ? bid.fanHandle : `@${bid.fanHandle}`}
        </p>
        <p className="text-slate-400 text-xs font-medium mt-0.5">
          {formatDollars(bid.amountPaid)}
        </p>
        <span className="text-xs text-slate-500 mt-0.5 block tracking-widest">#2</span>
      </div>
    </motion.div>
  );
}

// ---- Position #3 card (Jester, right of King) ----
function JesterCard({ bid }: { bid: Bid }) {
  return (
    <motion.div
      layout
      layoutId={bid.id}
      transition={SPRING}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <AvatarOrInitial url={bid.fanAvatarUrl} handle={bid.fanHandle} size="md" />
        {/* Bronze ring glow */}
        <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(205,127,50,0.5)] pointer-events-none" />
      </div>
      <div className="text-center">
        <p className="text-amber-600 font-bold text-sm">
          {bid.fanHandle.startsWith("@") ? bid.fanHandle : `@${bid.fanHandle}`}
        </p>
        <p className="text-slate-400 text-xs font-medium mt-0.5">
          {formatDollars(bid.amountPaid)}
        </p>
        <span className="text-xs text-slate-500 mt-0.5 block tracking-widest">#3</span>
      </div>
    </motion.div>
  );
}

// ---- Positions #4–10 row ----
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
      {/* Rank */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
        <span className="text-xs font-extrabold text-slate-400">{rank}</span>
      </div>

      {/* Avatar */}
      <AvatarOrInitial url={bid.fanAvatarUrl} handle={bid.fanHandle} size="sm" />

      {/* Handle + message */}
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

      {/* Amount */}
      <span className="text-sm font-extrabold text-indigo-400 flex-shrink-0">
        {formatDollars(bid.amountPaid)}
      </span>
    </motion.div>
  );
}

// ---- Empty slot placeholder ----
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
  const rest = bids.slice(3); // positions 4–10 (up to 7 items)

  return (
    <LayoutGroup id="podium">
      <div className="w-full max-w-lg mx-auto px-4 space-y-8">
        {/* ---- TOP 3 PODIUM ---- */}
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

          {/* King — center, tallest */}
          <div className="pb-0">
            {king ? (
              <motion.div
                layout
                layoutId={king.id}
                transition={SPRING}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative">
                  {/* Outer gold glow ring */}
                  <div className="absolute inset-0 rounded-full shadow-[0_0_40px_rgba(255,215,0,0.6)] pointer-events-none" />
                  <KingSpot
                    avatarUrl={king.fanAvatarUrl || ""}
                    fanHandle={king.fanHandle.replace(/^@/, "")}
                  />
                </div>
                <p className="text-yellow-500/80 text-xs font-bold tracking-[0.2em] mt-1">
                  {formatDollars(king.amountPaid)}
                </p>
                <span className="text-xs text-yellow-600/60 tracking-widest">#1 KING</span>
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

        {/* ---- POSITIONS 4–10 ---- */}
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
  );
}
