'use client';

// /dashboard — Creator settings page (auth-protected).
//
// On load:
//   1. Checks session via getSession() → redirects to /login if none.
//   2. Fetches creator row by auth_user_id.
//   3. If no row exists, auto-INSERTs one (new creator first login).
//   4. Pre-fills all form fields from existing data.
//
// Header: user avatar + email + logout button.
// Sections: Analytics · Connect Stripe (BYOS) · Public URL · Save · Seed.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getSession, signOut } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';
import type { Bid } from '@/types';

// ── Fake seed data ─────────────────────────────────────────────────────────
const FAKE_FANS = [
  { handle: '@BigSpenderSteve', message: 'I sold my couch for this', amount: 1200 },
  { handle: '@QueenBee99', message: 'bow down peasants', amount: 1100 },
  { handle: '@CryptoChad', message: 'TO THE MOON', amount: 1050 },
  { handle: '@PizzaLover420', message: 'I skipped lunch for this bid', amount: 900 },
  { handle: '@GamerGurl', message: 'gg ez', amount: 850 },
  { handle: '@DadJokeDave', message: "Hi Hungry, I'm on the podium", amount: 750 },
  { handle: '@CatMom_Lisa', message: 'My cat told me to do this', amount: 700 },
  { handle: '@SneakerheadSam', message: 'Cheaper than my last pair of Jordans', amount: 650 },
  { handle: '@NightOwlNina', message: "It's 3am and I have no regrets", amount: 550 },
  { handle: '@BudgetKing', message: 'Living large on minimum wage', amount: 500 },
];

// ── Animated counter ───────────────────────────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const steps = 30;
    const increment = value / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setDisplay(Math.min(Math.round(increment * step), value));
      if (step >= steps) clearInterval(interval);
    }, 800 / steps);
    return () => clearInterval(interval);
  }, [value]);
  return <>{display.toLocaleString('en-US')}</>;
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Analytics {
  totalRevenue: number;
  totalBids: number;
  currentKing: Bid | null;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient();

  // ── Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Creator form state
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [stripeConnected, setStripeConnected] = useState(false);

  // ── UI state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0, totalBids: 0, currentKing: null,
  });

  // ── Step 1: check session, redirect if missing ─────────────────────────
  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUser(session.user);
      setAuthLoading(false);
    });
  }, []);

  // ── Step 2: load creator row by auth_user_id ───────────────────────────
  useEffect(() => {
    if (!user) return;

    async function loadOrCreateCreator() {
      // Try to find the creator row linked to this auth user
      const { data: existing } = await supabase
        .from('creators')
        .select('*')
        .eq('auth_user_id', user!.id)
        .maybeSingle();

      if (existing) {
        setCreatorId(existing.id);
        setSlug(existing.slug || '');
        setStripeSecretKey(existing.stripe_secret_key || '');
        setStripeWebhookSecret(existing.stripe_webhook_secret || '');
        setStripeConnected(!!(existing.stripe_secret_key && existing.stripe_webhook_secret));
        return;
      }

      // No row → auto-INSERT for first-time creator login
      // Derive a temp slug from email username (unique enough as starting point)
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

      if (!error && created) {
        setCreatorId(created.id);
        setSlug(created.slug);
      }
    }

    loadOrCreateCreator();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analytics ──────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (cid: string) => {
    const { data: bids } = await supabase
      .from('bids')
      .select('amount_paid')
      .eq('creator_id', cid);

    const totalRevenue = bids?.reduce((sum, b) => sum + b.amount_paid, 0) ?? 0;
    const totalBids = bids?.length ?? 0;

    const { data: king } = await supabase
      .from('bids')
      .select('*')
      .eq('creator_id', cid)
      .order('amount_paid', { ascending: false })
      .limit(1)
      .maybeSingle();

    setAnalytics({ totalRevenue, totalBids, currentKing: king ?? null });
  }, [supabase]);

  useEffect(() => {
    if (creatorId) fetchAnalytics(creatorId);
  }, [creatorId, fetchAnalytics]);

  // ── Save settings ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);

    if (!slug.trim()) {
      setSaveMsg({ type: 'err', text: 'Slug is required' });
      setSaving(false);
      return;
    }
    if (!stripeSecretKey.trim() || !stripeWebhookSecret.trim()) {
      setSaveMsg({ type: 'err', text: 'Both Stripe keys are required' });
      setSaving(false);
      return;
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const row = {
      slug: cleanSlug,
      stripe_secret_key: stripeSecretKey.trim(),
      stripe_webhook_secret: stripeWebhookSecret.trim(),
      auth_user_id: user!.id,
    };

    let result;
    if (creatorId) {
      result = await supabase.from('creators').update(row).eq('id', creatorId).select().single();
    } else {
      result = await supabase.from('creators').insert(row).select().single();
    }

    if (result.error) {
      setSaveMsg({
        type: 'err',
        text: result.error.code === '23505' ? 'That slug is already taken' : result.error.message,
      });
    } else {
      setCreatorId(result.data.id);
      setSlug(result.data.slug);
      setStripeConnected(true);
      setSaveMsg({ type: 'ok', text: 'Settings saved!' });
    }
    setSaving(false);
  };

  // ── Seed fake bids ─────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (!creatorId) { setSeedMsg('Save your settings first'); return; }
    setSeeding(true);
    setSeedMsg(null);

    const rows = FAKE_FANS.map((fan) => ({
      creator_id: creatorId,
      fan_handle: fan.handle,
      fan_avatar_url: null,
      message: fan.message,
      amount_paid: fan.amount,
      stripe_payment_intent_id: `pi_seed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    }));

    const { error } = await supabase.from('bids').insert(rows);
    if (error) {
      setSeedMsg(`Error: ${error.message}`);
    } else {
      setSeedMsg('10 fake fans seeded! Check your podium.');
      fetchAnalytics(creatorId);
    }
    setSeeding(false);
  };

  const formatDollars = (cents: number) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // ── Loading spinner while auth resolves ────────────────────────────────
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

  // ── Dashboard UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Top header bar with user info ── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-white tracking-wide">
            Creator <span className="text-indigo-400">Dashboard</span>
          </span>

          {user && (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.email ?? 'Avatar'}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {(user.email ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}

              {/* Email */}
              <span className="text-xs text-slate-400 hidden sm:block max-w-[160px] truncate">
                {user.email}
              </span>

              {/* Logout */}
              <motion.button
                onClick={() => signOut()}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors
                           px-3 py-1.5 rounded-lg hover:bg-red-950/30 font-medium"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Log out
              </motion.button>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-extrabold text-white">
            Your{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Ego Podium
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure your podium and track earnings</p>
        </motion.div>

        {/* ── Analytics ── */}
        <motion.section
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 group hover:border-green-800/50 transition-colors">
            <span className="text-xs text-slate-500 block mb-2 tracking-widest">REVENUE</span>
            <span className="text-2xl font-bold text-green-400 block">
              $<AnimatedCounter value={Math.round(analytics.totalRevenue / 100)} />
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 group hover:border-indigo-800/50 transition-colors">
            <span className="text-xs text-slate-500 block mb-2 tracking-widest">BIDS</span>
            <span className="text-2xl font-bold text-indigo-400 block">
              <AnimatedCounter value={analytics.totalBids} />
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 group hover:border-yellow-800/50 transition-colors">
            <span className="text-xs text-slate-500 block mb-2 tracking-widest">KING</span>
            <span className="text-base font-bold text-yellow-400 truncate block">
              {analytics.currentKing?.fan_handle ?? '—'}
            </span>
            {analytics.currentKing && (
              <span className="text-xs text-slate-500 mt-0.5 block">
                {formatDollars(analytics.currentKing.amount_paid)}
              </span>
            )}
          </div>
        </motion.section>

        {/* ── Stripe (BYOS) ── */}
        <motion.section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Connect Stripe</h2>
                <AnimatePresence>
                  {stripeConnected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40
                                 flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Bring Your Own Stripe (BYOS)</p>
            </div>
            {stripeConnected && (
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20
                               px-2.5 py-1 rounded-full font-medium">
                Connected
              </span>
            )}
          </div>

          <div className="bg-slate-950/60 rounded-xl px-4 py-3 border border-indigo-900/40">
            <p className="text-sm text-white font-medium">
              Connect your OWN Stripe account. 100% of payments go directly to you.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              We never touch your money. Fans pay through your Stripe. No platform fee.
            </p>
          </div>

          {/* Secret key */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block font-medium tracking-widest">
              STRIPE SECRET KEY
            </label>
            <div className="relative">
              <input
                type="password"
                value={stripeSecretKey}
                onChange={(e) => { setStripeSecretKey(e.target.value); setStripeConnected(false); }}
                placeholder="sk_live_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3
                           text-white placeholder:text-slate-600 text-sm font-mono
                           focus:outline-none focus:border-indigo-500/60
                           focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
              />
              {stripeSecretKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
          </div>

          {/* Webhook secret */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block font-medium tracking-widest">
              STRIPE WEBHOOK SECRET
            </label>
            <div className="relative">
              <input
                type="password"
                value={stripeWebhookSecret}
                onChange={(e) => { setStripeWebhookSecret(e.target.value); setStripeConnected(false); }}
                placeholder="whsec_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3
                           text-white placeholder:text-slate-600 text-sm font-mono
                           focus:outline-none focus:border-indigo-500/60
                           focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
              />
              {stripeWebhookSecret && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
          </div>
        </motion.section>

        {/* ── Slug / URL ── */}
        <motion.section
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Public URL</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose your podium link</p>
          </div>

          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="mrbeast"
            maxLength={40}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3
                       text-white placeholder:text-slate-600 text-sm
                       focus:outline-none focus:border-indigo-500/60
                       focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
          />

          <div className="bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800/70">
            <span className="text-xs text-slate-500">Your page: </span>
            <span className="text-sm font-mono">
              <span className="text-slate-600">yourcreatorpodium.com/</span>
              <span className="text-indigo-400 font-bold">
                {slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : '…'}
              </span>
            </span>
          </div>
        </motion.section>

        {/* ── Save button ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-base
                       bg-gradient-to-r from-indigo-600 to-violet-700
                       hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : 'Save All Settings'}
          </motion.button>

          <AnimatePresence>
            {saveMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm text-center mt-3 ${
                  saveMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {saveMsg.text}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Seeding ── */}
        <motion.section
          className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Demo Seeding</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Populate your podium with 10 fake fans ($5–$12). Real fans can outbid them.
            </p>
          </div>

          <motion.button
            onClick={handleSeed}
            disabled={seeding || !creatorId}
            className="w-full py-3 rounded-xl font-semibold text-sm
                       bg-slate-950 border border-slate-700 text-slate-200
                       hover:border-yellow-500/40 hover:shadow-[0_0_16px_rgba(234,179,8,0.1)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            {seeding ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-600 border-t-yellow-400 rounded-full animate-spin" />
                Seeding…
              </span>
            ) : 'Seed my podium with sample fans'}
          </motion.button>

          <AnimatePresence>
            {seedMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm text-center ${
                  seedMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {seedMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        <p className="text-xs text-slate-700 text-center pb-8">
          Creator Podium — Ego Podium
        </p>
      </div>
    </div>
  );
}
