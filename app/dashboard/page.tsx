'use client';

// /dashboard — Creator settings page (BYOS: Bring Your Own Stripe).
//
// Sections:
// 1. Analytics snapshot (revenue, bid count, current King)
// 2. Connect Stripe — 100% of payments go to the creator
// 3. Set public slug
// 4. Seed fake bids for demo

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Bid } from '@/types';

// ---- Fake seed data: funny handles and messages with $5–$12 bids ----
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

// ---- Animated counter that counts up from 0 to target ----
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <>{prefix}{display.toLocaleString('en-US')}{suffix}</>;
}

interface Analytics {
  totalRevenue: number;
  totalBids: number;
  currentKing: Bid | null;
}

export default function DashboardPage() {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [stripeConnected, setStripeConnected] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    totalBids: 0,
    currentKing: null,
  });

  // ---- Load existing creator ----
  useEffect(() => {
    async function load() {
      const { data } = await supabaseBrowser
        .from('creators')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setCreatorId(data.id);
        setSlug(data.slug || '');
        setStripeSecretKey(data.stripe_secret_key || '');
        setStripeWebhookSecret(data.stripe_webhook_secret || '');
        setStripeConnected(!!(data.stripe_secret_key && data.stripe_webhook_secret));
      }
    }
    load();
  }, []);

  // ---- Fetch analytics ----
  const fetchAnalytics = useCallback(async (cid: string) => {
    const { data: bids } = await supabaseBrowser
      .from('bids')
      .select('amount_paid')
      .eq('creator_id', cid);

    const totalRevenue = bids?.reduce((sum, b) => sum + b.amount_paid, 0) ?? 0;
    const totalBids = bids?.length ?? 0;

    const { data: king } = await supabaseBrowser
      .from('bids')
      .select('*')
      .eq('creator_id', cid)
      .order('amount_paid', { ascending: false })
      .limit(1)
      .single();

    setAnalytics({ totalRevenue, totalBids, currentKing: king ?? null });
  }, []);

  useEffect(() => {
    if (creatorId) fetchAnalytics(creatorId);
  }, [creatorId, fetchAnalytics]);

  // ---- Save settings ----
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

    const row = {
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
      stripe_secret_key: stripeSecretKey.trim(),
      stripe_webhook_secret: stripeWebhookSecret.trim(),
    };

    let result;
    if (creatorId) {
      result = await supabaseBrowser.from('creators').update(row).eq('id', creatorId).select().single();
    } else {
      result = await supabaseBrowser.from('creators').insert(row).select().single();
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
      setSaveMsg({ type: 'ok', text: 'Settings saved successfully!' });
    }
    setSaving(false);
  };

  // ---- Seed fake bids ----
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

    const { error } = await supabaseBrowser.from('bids').insert(rows);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-text-main">
            Creator
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent ml-2">
              Dashboard
            </span>
          </h1>
          <p className="text-sm text-muted mt-1">Manage your Ego Podium</p>
        </motion.div>

        {/* ====== ANALYTICS ====== */}
        <motion.section
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Revenue */}
          <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs text-muted block mb-2 tracking-wide">TOTAL REVENUE</span>
            <span className="text-2xl font-bold text-green-400 block">
              $<AnimatedCounter value={Math.round(analytics.totalRevenue / 100 * 100) / 100} />
            </span>
          </div>

          {/* Bids */}
          <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs text-muted block mb-2 tracking-wide">TOTAL BIDS</span>
            <span className="text-2xl font-bold text-primary block">
              <AnimatedCounter value={analytics.totalBids} />
            </span>
          </div>

          {/* King */}
          <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs text-muted block mb-2 tracking-wide">CURRENT KING</span>
            <span className="text-lg font-bold text-yellow-400 truncate block">
              {analytics.currentKing?.fan_handle ?? '—'}
            </span>
            {analytics.currentKing && (
              <span className="text-xs text-muted">{formatDollars(analytics.currentKing.amount_paid)}</span>
            )}
          </div>
        </motion.section>

        {/* ====== STRIPE CONNECTION (BYOS) ====== */}
        <motion.section
          className="bg-surface border border-border rounded-2xl p-6 space-y-5 relative overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* BYOS header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-main">Connect Stripe</h2>
                {/* Green checkmark when connected */}
                <AnimatePresence>
                  {stripeConnected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-sm text-muted mt-1">
                Bring Your Own Stripe (BYOS)
              </p>
            </div>
            {stripeConnected && (
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">
                Connected
              </span>
            )}
          </div>

          {/* BYOS explainer */}
          <div className="bg-background/60 rounded-xl px-4 py-3 border border-primary/20">
            <p className="text-sm text-text-main font-medium">
              Connect your OWN Stripe account. 100% of payments go directly to you.
            </p>
            <p className="text-xs text-muted mt-1">
              We never touch your money. Fans pay you directly through your Stripe account.
              No platform fees. No middleman.
            </p>
          </div>

          {/* Stripe Secret Key */}
          <div>
            <label className="text-xs text-muted mb-1.5 block font-medium tracking-wide">STRIPE SECRET KEY</label>
            <div className="relative">
              <input
                type="password"
                value={stripeSecretKey}
                onChange={(e) => { setStripeSecretKey(e.target.value); setStripeConnected(false); }}
                placeholder="sk_live_..."
                className="w-full bg-background border border-border rounded-xl px-4 py-3
                           text-text-main placeholder:text-muted/50 text-sm font-mono
                           focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)] transition-all"
              />
              {stripeSecretKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              )}
            </div>
          </div>

          {/* Stripe Webhook Secret */}
          <div>
            <label className="text-xs text-muted mb-1.5 block font-medium tracking-wide">STRIPE WEBHOOK SECRET</label>
            <div className="relative">
              <input
                type="password"
                value={stripeWebhookSecret}
                onChange={(e) => { setStripeWebhookSecret(e.target.value); setStripeConnected(false); }}
                placeholder="whsec_..."
                className="w-full bg-background border border-border rounded-xl px-4 py-3
                           text-text-main placeholder:text-muted/50 text-sm font-mono
                           focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)] transition-all"
              />
              {stripeWebhookSecret && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* ====== SLUG ====== */}
        <motion.section
          className="bg-surface border border-border rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <h2 className="text-lg font-bold text-text-main">Public URL</h2>
            <p className="text-xs text-muted mt-0.5">Choose your podium link</p>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block font-medium tracking-wide">SLUG</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mrbeast"
              maxLength={40}
              className="w-full bg-background border border-border rounded-xl px-4 py-3
                         text-text-main placeholder:text-muted/50 text-sm
                         focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)] transition-all"
            />
          </div>

          {/* Live preview */}
          <div className="bg-background/60 rounded-xl px-4 py-3 border border-border/50">
            <span className="text-xs text-muted">Your page: </span>
            <span className="text-sm font-mono">
              <span className="text-muted">yourcreatorpodium.com/</span>
              <span className="text-primary font-bold">
                {slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : '...'}
              </span>
            </span>
          </div>
        </motion.section>

        {/* ====== SAVE BUTTON ====== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-base
                       bg-gradient-to-r from-primary to-secondary
                       hover:shadow-[0_0_30px_rgba(79,70,229,0.3)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save All Settings'
            )}
          </motion.button>

          <AnimatePresence>
            {saveMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm text-center mt-3 ${saveMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
              >
                {saveMsg.text}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ====== SEEDING ====== */}
        <motion.section
          className="bg-surface border border-dashed border-border rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div>
            <h2 className="text-lg font-bold text-text-main">Demo Seeding</h2>
            <p className="text-xs text-muted mt-0.5">
              Populate your podium with 10 fake fans ($5 – $12 bids).
              Real fans can easily outbid them to take the throne.
            </p>
          </div>

          <motion.button
            onClick={handleSeed}
            disabled={seeding || !creatorId}
            className="w-full py-3 rounded-xl font-semibold text-sm
                       bg-background border border-border text-text-main
                       hover:border-yellow-500/40 hover:shadow-[0_0_16px_rgba(234,179,8,0.1)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            {seeding ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-muted/30 border-t-yellow-400 rounded-full animate-spin" />
                Seeding...
              </span>
            ) : (
              'Seed my podium with sample fans'
            )}
          </motion.button>

          <AnimatePresence>
            {seedMsg && (
              <motion.p
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

        {/* Footer */}
        <p className="text-xs text-muted text-center pb-8">
          The Creator Podium — Ego Podium
        </p>
      </div>
    </div>
  );
}
