'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useSpring, animate as fmAnimate } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getSession, signOut } from '@/lib/auth';
import RollingNumber from '@/components/RollingNumber';
import type { User } from '@supabase/supabase-js';
import type { Bid } from '@/types';

// ── Rolling count (integers, no $ prefix) ──────────────────────────────────
function RollingCount({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, { stiffness: 90, damping: 14, mass: 0.6 });
  const displayRef = useRef<HTMLSpanElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      motionValue.set(value);
      return;
    }
    fmAnimate(motionValue, value, { duration: 1.4, ease: [0.12, 1, 0.28, 1] });
  }, [value, motionValue]);

  useEffect(() => {
    return springValue.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = Math.round(Math.max(0, v)).toLocaleString('en-US');
      }
    });
  }, [springValue]);

  return (
    <span ref={displayRef} className={className}>
      {Math.round(value).toLocaleString('en-US')}
    </span>
  );
}

// ── Seed data (exact handles + amounts from spec) ───────────────────────────
const FAKE_FANS = [
  { handle: '@CryptoChad',       message: 'TO THE MOON 🚀',                    amount: 1200 },
  { handle: '@BigSpenderSteve',  message: 'I sold my couch for this',           amount: 1100 },
  { handle: '@DadJokeDave',      message: "Hi Hungry, I'm on the podium",        amount: 1000 },
  { handle: '@MemeQueen99',      message: 'This is fine 🔥',                    amount:  900 },
  { handle: '@TouchGrassPlease', message: 'Outside is overrated anyway',         amount:  800 },
  { handle: '@NFTBro2024',       message: 'My jpeg told me to do this',          amount:  700 },
  { handle: '@YOLOKing',         message: 'You only live once',                  amount:  700 },
  { handle: '@VibeCheck',        message: 'Vibe: immaculate ✅',                 amount:  600 },
  { handle: '@NoSleepCrew',      message: "It's 3am and I have no regrets",      amount:  600 },
  { handle: '@JustHereToWatch',  message: 'Here for the drama honestly',         amount:  500 },
];

// ── Types ───────────────────────────────────────────────────────────────────
interface Analytics {
  totalRevenueCents: number;
  totalBids: number;
  currentKing: Bid | null;
  avgBidCents: number;
}

interface CreatorRow {
  id: string;
  slug: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  plan_type: string;
  auth_user_id: string;
}

// ── Slug validation ─────────────────────────────────────────────────────────
function validateSlug(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (s.length < 3) return 'Slug must be at least 3 characters';
  return null;
}

function cleanSlug(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

// ── Plan badge config ────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, {
  badge: string;
  badgeClass: string;
  dotClass: string;
  headline: string;
  body: string;
  showUpgrade: boolean;
}> = {
  founding: {
    badge: '👑 Founding Creator',
    badgeClass: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    dotClass: 'bg-yellow-400',
    headline: '0% Platform Fee — Forever',
    body: 'You are one of our 10 founding creators. 100% of every payment goes directly to you.',
    showUpgrade: false,
  },
  pro: {
    badge: '⚡ Pro',
    badgeClass: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    dotClass: 'bg-purple-400',
    headline: '0% Platform Fee',
    body: 'You are on the Pro plan. Every dollar fans pay goes straight to you.',
    showUpgrade: false,
  },
  starter: {
    badge: 'Starter',
    badgeClass: 'text-slate-400 bg-slate-700/40 border-slate-600/40',
    dotClass: 'bg-slate-400',
    headline: '15% Platform Fee',
    body: 'Upgrade to Pro to keep 100% of every payment.',
    showUpgrade: true,
  },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient();

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Creator row
  const [creator, setCreator] = useState<CreatorRow | null>(null);

  // Slug section
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugMsg, setSlugMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Stripe section
  const [stripeKey, setStripeKey] = useState('');
  const [stripeWebhook, setStripeWebhook] = useState('');
  const [stripeConnected, setStripeConnected] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenueCents: 0,
    totalBids: 0,
    currentKing: null,
    avgBidCents: 0,
  });

  // Seeding
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getSession().then((session) => {
      if (!session) { window.location.href = '/login'; return; }
      setUser(session.user);
      setAuthLoading(false);
    });
  }, []);

  // ── Load / create creator row ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function loadOrCreate() {
      const { data: existing } = await supabase
        .from('creators')
        .select('*')
        .eq('auth_user_id', user!.id)
        .maybeSingle();

      if (existing) {
        hydrate(existing);
        return;
      }

      // First login — auto-INSERT
      const emailUser = (user!.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '') || 'creator';
      const tempSlug = `${emailUser}-${user!.id.slice(0, 6)}`;

      const { data: created, error } = await supabase
        .from('creators')
        .insert({
          auth_user_id: user!.id,
          slug: tempSlug,
          stripe_secret_key: '',
          stripe_webhook_secret: '',
        })
        .select()
        .single();

      if (!error && created) hydrate(created);
    }

    loadOrCreate();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function hydrate(row: CreatorRow) {
    setCreator(row);
    setSlug(row.slug ?? '');
    setStripeKey(row.stripe_secret_key ?? '');
    setStripeWebhook(row.stripe_webhook_secret ?? '');
    setStripeConnected(!!(row.stripe_secret_key && row.stripe_webhook_secret));
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (cid: string) => {
    const { data: bids } = await supabase
      .from('bids')
      .select('*')
      .eq('creator_id', cid);

    const totalRevenueCents = bids?.reduce((s, b) => s + b.amount_paid, 0) ?? 0;
    const totalBids = bids?.length ?? 0;
    const avgBidCents = totalBids > 0 ? Math.round(totalRevenueCents / totalBids) : 0;

    const king = bids?.length
      ? bids.reduce((best, b) => (b.amount_paid > best.amount_paid ? b : best), bids[0])
      : null;

    setAnalytics({ totalRevenueCents, totalBids, currentKing: king ?? null, avgBidCents });
  }, [supabase]);

  useEffect(() => {
    if (creator?.id) fetchAnalytics(creator.id);
  }, [creator?.id, fetchAnalytics]);

  // ── Save slug ──────────────────────────────────────────────────────────────
  const handleSaveSlug = async () => {
    const err = validateSlug(slug);
    if (err) { setSlugError(err); return; }
    setSlugError(null);
    setSavingSlug(true);
    setSlugMsg(null);

    const clean = cleanSlug(slug);
    const { data, error } = await supabase
      .from('creators')
      .update({ slug: clean })
      .eq('id', creator!.id)
      .select()
      .single();

    if (error) {
      setSlugMsg({
        type: 'err',
        text: error.code === '23505' ? 'That slug is already taken — try another' : error.message,
      });
    } else {
      setCreator((c) => c ? { ...c, slug: data.slug } : c);
      setSlug(data.slug);
      setSlugMsg({ type: 'ok', text: '✓ Saved' });
      setTimeout(() => setSlugMsg(null), 3000);
    }
    setSavingSlug(false);
  };

  // ── Save Stripe keys ───────────────────────────────────────────────────────
  const handleSaveStripe = async () => {
    if (!stripeKey.trim() || !stripeWebhook.trim()) {
      setStripeMsg({ type: 'err', text: 'Both keys are required' });
      return;
    }
    setSavingStripe(true);
    setStripeMsg(null);

    const { error } = await supabase
      .from('creators')
      .update({
        stripe_secret_key: stripeKey.trim(),
        stripe_webhook_secret: stripeWebhook.trim(),
      })
      .eq('id', creator!.id);

    if (error) {
      setStripeMsg({ type: 'err', text: error.message });
    } else {
      setStripeConnected(true);
      setStripeMsg({ type: 'ok', text: '✓ Connected' });
      setTimeout(() => setStripeMsg(null), 3000);
    }
    setSavingStripe(false);
  };

  // ── Seed fake bids ─────────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (!creator?.id) return;
    if (analytics.totalBids > 0) {
      setSeedMsg('Podium already has bids — seeding disabled');
      return;
    }
    setSeeding(true);
    setSeedMsg(null);

    const rows = FAKE_FANS.map((fan) => ({
      creator_id: creator.id,
      fan_handle: fan.handle,
      fan_avatar_url: null,
      message: fan.message,
      amount_paid: fan.amount,
      stripe_payment_intent_id: `pi_seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }));

    const { error } = await supabase.from('bids').insert(rows);
    if (error) {
      setSeedMsg(`Error: ${error.message}`);
    } else {
      setSeedMsg('🌱 10 fans seeded! Check your podium.');
      fetchAnalytics(creator.id);
    }
    setSeeding(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  const planKey = (creator?.plan_type ?? 'starter') as keyof typeof PLAN_CONFIG;
  const plan = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.starter;
  const savedSlug = creator?.slug ?? '';

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── SECTION 1: Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Title */}
          <h1 className="text-sm font-bold text-white tracking-wide">
            Your Podium Dashboard <span className="text-yellow-400">👑</span>
          </h1>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url ? (
                <div className="relative w-8 h-8 flex-shrink-0">
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt={user.email ?? 'avatar'}
                    fill
                    sizes="32px"
                    className="rounded-full object-cover border border-slate-700"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center
                               text-white text-xs font-bold flex-shrink-0">
                  {(user.email ?? 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs text-slate-400 hidden sm:block max-w-[160px] truncate">
                {user.email}
              </span>
              <motion.button
                onClick={() => signOut()}
                className="text-xs text-slate-500 hover:text-red-400 px-3 py-1.5 rounded-lg
                           hover:bg-red-950/30 font-medium transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Log out
              </motion.button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Page heading */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-extrabold text-white">
            Your{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Podium Dashboard
            </span>{' '}
            👑
          </h2>
          <p className="text-sm text-slate-500 mt-1">Configure your podium and track earnings</p>
        </motion.div>

        {/* ── SECTION 3: Analytics ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <p className="text-xs font-semibold tracking-widest text-slate-600 uppercase mb-3">Analytics</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4
                           hover:border-green-800/50 transition-colors group">
              <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">Revenue</span>
              <RollingNumber
                value={analytics.totalRevenueCents}
                className="text-2xl font-bold text-green-400"
              />
            </div>

            {/* Total bids */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4
                           hover:border-indigo-800/50 transition-colors">
              <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">Bids</span>
              <RollingCount
                value={analytics.totalBids}
                className="text-2xl font-bold text-indigo-400"
              />
            </div>

            {/* Current King */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4
                           hover:border-yellow-800/50 transition-colors">
              <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">King</span>
              <span className="text-base font-bold text-yellow-400 truncate block">
                {analytics.currentKing?.fan_handle ?? '—'}
              </span>
              {analytics.currentKing && (
                <RollingNumber
                  value={analytics.currentKing.amount_paid}
                  className="text-xs text-slate-500 mt-0.5"
                />
              )}
            </div>

            {/* Avg bid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4
                           hover:border-violet-800/50 transition-colors">
              <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">Avg Bid</span>
              <RollingNumber
                value={analytics.avgBidCents}
                className="text-2xl font-bold text-violet-400"
              />
            </div>
          </div>
        </motion.section>

        {/* ── SECTION 2a: Slug ──────────────────────────────────────────────── */}
        <motion.section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div>
            <h3 className="text-lg font-bold text-white">Setup Your Podium</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose your public page URL</p>
          </div>

          {/* Slug input */}
          <div>
            <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5 font-medium">
              Your Page URL
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugError(null);
                setSlugMsg(null);
              }}
              placeholder="mrbeast"
              maxLength={40}
              className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white
                         placeholder:text-slate-600 text-sm
                         focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
                         transition-all ${slugError
                           ? 'border-red-500/60 focus:border-red-500/80'
                           : 'border-slate-700 focus:border-indigo-500/60'}`}
            />
            {slugError && (
              <p className="text-xs text-red-400 mt-1.5">{slugError}</p>
            )}
          </div>

          {/* Live preview */}
          <div className="bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800/70">
            <span className="text-xs text-slate-500">Your page: </span>
            <span className="text-sm font-mono">
              <span className="text-slate-600">creatorpodium.com/</span>
              <span className={`font-bold ${cleanSlug(slug).length >= 3 ? 'text-indigo-400' : 'text-slate-600'}`}>
                {slug ? cleanSlug(slug) : '…'}
              </span>
            </span>
          </div>

          {/* Save slug */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleSaveSlug}
              disabled={savingSlug || !creator}
              className="px-5 py-2.5 min-h-[56px] rounded-xl font-semibold text-sm text-white
                         bg-indigo-600 hover:bg-indigo-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {savingSlug ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : 'Save URL'}
            </motion.button>

            <AnimatePresence>
              {slugMsg && (
                <motion.span
                  key="slug-msg"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-sm font-medium ${slugMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {slugMsg.text}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── SECTION 2b: Stripe ────────────────────────────────────────────── */}
        <motion.section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Connect Stripe</h3>
              <p className="text-xs text-slate-500 mt-0.5">Bring Your Own Stripe (BYOS)</p>
            </div>
            {/* Connected / Not Connected badge */}
            {stripeConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400
                               bg-green-500/10 border border-green-500/25 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                ✓ Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400
                               bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                ⚠ Not Connected
              </span>
            )}
          </div>

          {/* BYOS callout */}
          <div className="bg-indigo-950/40 rounded-xl px-4 py-3 border border-indigo-800/30">
            <p className="text-sm text-white font-semibold">
              💰 100% of payments go directly to YOU
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Connect your own Stripe account. Fans pay through your Stripe — we never touch your money.
            </p>
          </div>

          {/* Secret key */}
          <div>
            <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5 font-medium">
              Stripe Secret Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={stripeKey}
                onChange={(e) => { setStripeKey(e.target.value); setStripeConnected(false); setStripeMsg(null); }}
                placeholder="sk_live_... or sk_test_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3
                           text-white placeholder:text-slate-600 text-sm font-mono
                           focus:outline-none focus:border-indigo-500/60
                           focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
              />
              {stripeKey && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
          </div>

          {/* Webhook secret */}
          <div>
            <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5 font-medium">
              Stripe Webhook Secret
            </label>
            <div className="relative">
              <input
                type="password"
                value={stripeWebhook}
                onChange={(e) => { setStripeWebhook(e.target.value); setStripeConnected(false); setStripeMsg(null); }}
                placeholder="whsec_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3
                           text-white placeholder:text-slate-600 text-sm font-mono
                           focus:outline-none focus:border-indigo-500/60
                           focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
              />
              {stripeWebhook && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
          </div>

          {/* Save Stripe */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleSaveStripe}
              disabled={savingStripe || !creator}
              className="px-5 py-2.5 min-h-[56px] rounded-xl font-semibold text-sm text-white
                         bg-indigo-600 hover:bg-indigo-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {savingStripe ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : 'Save Keys'}
            </motion.button>

            <AnimatePresence>
              {stripeMsg && (
                <motion.span
                  key="stripe-msg"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-sm font-medium ${stripeMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {stripeMsg.text}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── SECTION 4: Podium Controls ───────────────────────────────────── */}
        <motion.section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <div>
            <h3 className="text-lg font-bold text-white">Podium Controls</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage and preview your live podium</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Seed button */}
            <div className="flex-1">
              <motion.button
                onClick={handleSeed}
                disabled={seeding || !creator || analytics.totalBids > 0}
                className="w-full py-3 min-h-[56px] rounded-xl font-semibold text-sm
                           bg-slate-950 border border-slate-700 text-slate-200
                           hover:border-green-500/40 hover:shadow-[0_0_16px_rgba(34,197,94,0.1)]
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                whileHover={{ scale: analytics.totalBids === 0 ? 1.01 : 1 }}
                whileTap={{ scale: analytics.totalBids === 0 ? 0.97 : 1 }}
              >
                {seeding ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
                    Seeding…
                  </span>
                ) : analytics.totalBids > 0 ? (
                  '🌱 Already Seeded'
                ) : (
                  '🌱 Seed My Podium'
                )}
              </motion.button>
              {analytics.totalBids === 0 && (
                <p className="text-[10px] text-slate-600 mt-1.5 text-center">
                  Inserts 10 demo fans — only works on an empty podium
                </p>
              )}
            </div>

            {/* Preview button */}
            <div className="flex-1">
              <motion.a
                href={savedSlug ? `/${savedSlug}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={!savedSlug ? (e) => e.preventDefault() : undefined}
                className={`flex items-center justify-center gap-2 w-full py-3 min-h-[56px] rounded-xl
                           font-semibold text-sm border transition-all
                           ${savedSlug
                             ? 'bg-slate-950 border-indigo-700/50 text-indigo-300 hover:border-indigo-500 hover:shadow-[0_0_16px_rgba(99,102,241,0.15)] cursor-pointer'
                             : 'bg-slate-950/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                           }`}
                whileHover={savedSlug ? { scale: 1.01 } : {}}
                whileTap={savedSlug ? { scale: 0.97 } : {}}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                👁 Preview My Podium
              </motion.a>
              {!savedSlug && (
                <p className="text-[10px] text-slate-600 mt-1.5 text-center">
                  Set and save your slug first
                </p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {seedMsg && (
              <motion.p
                key="seed-msg"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm text-center ${seedMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}
              >
                {seedMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── SECTION 5: Plan Badge ─────────────────────────────────────────── */}
        <motion.section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white">Your Plan</h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
                                 border px-3 py-1 rounded-full ${plan.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${plan.dotClass}`} />
                  {plan.badge}
                </span>
              </div>
              <p className={`text-sm font-semibold ${
                planKey === 'founding' ? 'text-yellow-400' :
                planKey === 'pro' ? 'text-purple-400' : 'text-slate-300'
              }`}>
                {plan.headline}
              </p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {plan.body}
              </p>
            </div>

            {plan.showUpgrade && (
              <motion.button
                className="px-5 py-2.5 min-h-[56px] rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-purple-600 to-indigo-600
                           hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all flex-shrink-0"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                ⚡ Upgrade to Pro
              </motion.button>
            )}
          </div>

          {planKey === 'founding' && (
            <div className="mt-4 bg-yellow-400/5 border border-yellow-400/15 rounded-xl px-4 py-3">
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                🎖 Founding Creator status is invite-only and permanent.
                Your 0% fee rate will never change — no matter what we charge new creators in the future.
              </p>
            </div>
          )}
        </motion.section>

        <p className="text-xs text-slate-700 text-center pb-8">
          Creator Podium · Your fans compete for the top spot
        </p>
      </div>
    </div>
  );
}
