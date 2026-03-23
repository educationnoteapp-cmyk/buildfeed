'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getSession } from '@/lib/auth';
import PlanActions from './PlanActions';
import type { Bid } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────
interface CreatorRow {
  id: string;
  slug: string;
  plan_type: string;
  auth_user_id: string;
  created_at: string;
  total_bids: number;
  total_revenue: number; // raw amount_paid units
}

interface RecentBid extends Omit<Bid, 'stripe_payment_intent_id' | 'fan_avatar_url'> {
  creator_slug: string;
}

interface Stats {
  totalCreators: number;
  totalBids: number;
  totalRevenue: number;
  foundingCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// amount_paid is stored as cents in this system
function fmtAmount(amount: number): string {
  return `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function fmtRevenue(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

// ─── Plan badge ──────────────────────────────────────────────────────────────
const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  founding: { label: '👑 Founding', cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  pro:      { label: '⚡ Pro',      cls: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  starter:  { label: 'Starter',     cls: 'text-slate-400 bg-slate-800/60  border-slate-700/40'   },
};

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent, warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'gold' | 'cyan' | 'green' | 'red';
  warn?: boolean;
}) {
  const colorMap: Record<string, string> = {
    gold:  'text-yellow-400',
    cyan:  'text-cyan-400',
    green: 'text-emerald-400',
    red:   'text-red-400',
  };
  return (
    <div className={`bg-slate-900 border rounded-2xl p-5
      ${warn ? 'border-red-500/40' : 'border-slate-800'}`}
    >
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">
        {label}
      </p>
      <p className={`text-3xl font-black ${accent ? colorMap[accent] : 'text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [ready,   setReady]   = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats,      setStats]      = useState<Stats>({ totalCreators: 0, totalBids: 0, totalRevenue: 0, foundingCount: 0 });
  const [creators,   setCreators]   = useState<CreatorRow[]>([]);
  const [recentBids, setRecentBids] = useState<RecentBid[]>([]);

  // ── Auth guard — check NEXT_PUBLIC_ADMIN_EMAIL ──────────────────────────
  useEffect(() => {
    getSession().then((session) => {
      if (!session) { router.replace('/login'); return; }

      const userEmail   = session.user.email ?? '';
      const adminEmail  = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

      if (!adminEmail || userEmail !== adminEmail) {
        router.replace('/login');
        return;
      }
      setReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loader ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);

    // Fetch all creators
    const { data: rawCreators } = await supabase
      .from('creators')
      .select('id, slug, plan_type, auth_user_id, created_at')
      .order('created_at', { ascending: false });

    // Fetch all bids (we only pull the fields we need)
    const { data: allBids } = await supabase
      .from('bids')
      .select('id, creator_id, fan_handle, message, amount_paid, created_at')
      .order('created_at', { ascending: false });

    // Aggregate per-creator bid stats
    const agg: Record<string, { count: number; revenue: number }> = {};
    (allBids ?? []).forEach((b) => {
      if (!agg[b.creator_id]) agg[b.creator_id] = { count: 0, revenue: 0 };
      agg[b.creator_id].count   += 1;
      agg[b.creator_id].revenue += b.amount_paid;
    });

    // Build enriched creator rows
    const rows: CreatorRow[] = (rawCreators ?? []).map((c) => ({
      ...c,
      total_bids:    agg[c.id]?.count   ?? 0,
      total_revenue: agg[c.id]?.revenue ?? 0,
    }));

    // Slug lookup map for the recent bids feed
    const slugMap: Record<string, string> = {};
    rows.forEach((c) => { slugMap[c.id] = c.slug; });

    // Last 20 bids enriched with creator slug
    const recent: RecentBid[] = (allBids ?? []).slice(0, 20).map((b) => ({
      id:          b.id,
      creator_id:  b.creator_id,
      fan_handle:  b.fan_handle,
      message:     b.message ?? null,
      amount_paid: b.amount_paid,
      created_at:  b.created_at,
      creator_slug: slugMap[b.creator_id] ?? '?',
    }));

    // Platform-wide stats
    const totalRevenue  = rows.reduce((s, c) => s + c.total_revenue, 0);
    const totalBids     = rows.reduce((s, c) => s + c.total_bids,    0);
    const foundingCount = rows.filter((c) => c.plan_type === 'founding').length;

    setCreators(rows);
    setRecentBids(recent);
    setStats({ totalCreators: rows.length, totalBids, totalRevenue, foundingCount });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  // ── Optimistic plan change handler (passed to PlanActions) ───────────────
  const handlePlanChange = useCallback((creatorId: string, newPlan: string) => {
    setCreators((prev) => {
      const old = prev.find((c) => c.id === creatorId);
      const wasFounder = old?.plan_type === 'founding';
      const isFounder  = newPlan === 'founding';

      setStats((s) => ({
        ...s,
        foundingCount: s.foundingCount + (isFounder ? 1 : 0) - (wasFounder ? 1 : 0),
      }));

      return prev.map((c) => c.id === creatorId ? { ...c, plan_type: newPlan } : c);
    });
  }, []);

  // ── Spinner while loading ─────────────────────────────────────────────────
  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-slate-800 border-t-yellow-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Home
            </a>
            <span className="text-slate-700">/</span>
            <span className="text-sm font-bold text-white">🛡 Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Founding counter pill */}
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border
              ${stats.foundingCount >= 10
                ? 'text-red-400 border-red-500/40 bg-red-500/8'
                : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/8'
              }`}
            >
              👑 {stats.foundingCount}/10 founding
            </span>
            <motion.button
              onClick={loadData}
              whileTap={{ scale: 0.93 }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors
                         px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700"
            >
              ↻ Refresh
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        {/* Page heading */}
        <div>
          <h1 className="text-3xl font-black">Creator Podium <span className="text-yellow-400">Admin</span></h1>
          <p className="text-slate-500 text-sm mt-1">Internal dashboard — 🔒 restricted access</p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — STATS OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-4">
            Platform Overview
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Creators"
              value={stats.totalCreators}
              accent="cyan"
            />
            <StatCard
              label="Total Bids"
              value={stats.totalBids.toLocaleString('en-US')}
              accent="green"
            />
            <StatCard
              label="Total Revenue"
              value={fmtRevenue(stats.totalRevenue)}
              sub="across all creators"
              accent="gold"
            />
            <StatCard
              label="Founding Creators"
              value={`${stats.foundingCount} / 10`}
              sub={stats.foundingCount >= 10
                ? '⚠ Limit reached'
                : `${10 - stats.foundingCount} spots left`}
              accent={stats.foundingCount >= 10 ? 'red' : 'gold'}
              warn={stats.foundingCount >= 10}
            />
          </div>

          <AnimatePresence>
            {stats.foundingCount >= 10 && (
              <motion.div
                key="founding-warn"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 px-4 py-3 rounded-xl border border-red-500/30
                           bg-red-500/5 text-sm text-red-400 font-semibold"
              >
                ⚠ Founding limit reached — no new founding creators can be assigned.
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — CREATORS TABLE
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-4">
            All Creators ({creators.length})
          </p>

          {creators.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm border border-slate-800 rounded-2xl">
              No creators signed up yet
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 overflow-hidden">
              {/* Column headers (desktop) */}
              <div className="hidden sm:grid px-4 py-2.5 bg-slate-900 border-b border-slate-800
                              text-[10px] text-slate-600 uppercase tracking-widest font-semibold"
                style={{ gridTemplateColumns: '2rem 1fr 9rem 8rem 5rem 7rem 7rem 11rem' }}
              >
                <span />
                <span>ID / Auth</span>
                <span>Slug</span>
                <span>Plan</span>
                <span>Bids</span>
                <span>Revenue</span>
                <span>Joined</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-800/60">
                {creators.map((cr, i) => {
                  const isFounder = cr.plan_type === 'founding';
                  const badge     = PLAN_BADGE[cr.plan_type] ?? PLAN_BADGE.starter;
                  const hue       = (cr.slug.charCodeAt(0) * 37) % 360;

                  return (
                    <motion.div
                      key={cr.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className={`flex flex-col sm:grid gap-2 sm:gap-3 px-4 py-3.5
                                  items-start sm:items-center transition-colors
                                  ${isFounder
                                    ? 'bg-yellow-400/[0.025] hover:bg-yellow-400/[0.045]'
                                    : 'hover:bg-slate-900/50'
                                  }`}
                      style={{ gridTemplateColumns: '2rem 1fr 9rem 8rem 5rem 7rem 7rem 11rem' }}
                    >
                      {/* Avatar letter */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center
                                   text-xs font-black text-white flex-shrink-0"
                        style={{ background: `hsl(${hue},55%,32%)` }}
                      >
                        {cr.slug[0]?.toUpperCase() ?? '?'}
                      </div>

                      {/* Auth user ID */}
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {cr.auth_user_id.slice(0, 20)}…
                        </p>
                      </div>

                      {/* Slug */}
                      <div>
                        <a
                          href={`/${cr.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
                        >
                          /{cr.slug}
                        </a>
                      </div>

                      {/* Plan */}
                      <div>
                        <span className={`inline-flex items-center text-[10px] font-semibold
                                         border px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Total bids */}
                      <p className="text-sm font-bold text-white">
                        {cr.total_bids.toLocaleString('en-US')}
                      </p>

                      {/* Total revenue */}
                      <p className={`text-sm font-bold
                        ${cr.total_revenue > 0 ? 'text-emerald-400' : 'text-slate-700'}`}
                      >
                        {fmtRevenue(cr.total_revenue)}
                      </p>

                      {/* Joined date */}
                      <p className="text-[11px] text-slate-600">
                        {new Date(cr.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: '2-digit',
                        })}
                      </p>

                      {/* Plan actions */}
                      <div className="sm:flex sm:justify-end">
                        <PlanActions
                          creatorId={cr.id}
                          currentPlan={cr.plan_type}
                          foundingCount={stats.foundingCount}
                          onPlanChange={handlePlanChange}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — RECENT BIDS FEED
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-4">
            Recent Bids (last 20)
          </p>

          {recentBids.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm border border-slate-800 rounded-2xl">
              No bids yet
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 overflow-hidden">
              {/* Column headers (desktop) */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_7rem] gap-3 px-4 py-2.5
                              bg-slate-900 border-b border-slate-800
                              text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                <span>Creator</span>
                <span>Fan</span>
                <span>Amount</span>
                <span>When</span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {recentBids.map((bid, i) => (
                  <motion.div
                    key={bid.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_7rem]
                               gap-1 sm:gap-3 px-4 py-3 items-start sm:items-center
                               hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Creator slug */}
                    <a
                      href={`/${bid.creator_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
                    >
                      /{bid.creator_slug}
                    </a>

                    {/* Fan handle + message */}
                    <div className="min-w-0">
                      <p className="text-xs text-white font-semibold">{bid.fan_handle}</p>
                      {bid.message && (
                        <p className="text-[10px] text-slate-500 italic truncate max-w-[160px]">
                          "{bid.message}"
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <p className="text-sm font-black text-emerald-400">
                      {fmtAmount(bid.amount_paid)}
                    </p>

                    {/* Time ago */}
                    <p className="text-[10px] text-slate-600 whitespace-nowrap">
                      {timeAgo(bid.created_at)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
