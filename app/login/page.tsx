'use client';

// /login — Creator Podium sign-in page.
//
// • Already logged in → redirects to /dashboard immediately.
// • Single "Continue with Google" button triggers Supabase OAuth.
// • Shows error when ?error param is present (from /auth/callback).

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession, signInWithGoogle } from '@/lib/auth';

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface ?error from OAuth callback redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error')) setError('Sign-in failed. Please try again.');
    }
  }, []);

  // Skip login UI if session already active
  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        window.location.href = '/dashboard';
      } else {
        setChecking(false);
      }
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // signInWithGoogle() triggers a full-page redirect — nothing below runs on success
    } catch {
      setError('Failed to start sign-in. Please try again.');
      setSigningIn(false);
    }
  };

  // Blank screen while verifying session — prevents flash of login UI
  if (checking) {
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px]
                        rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px]
                        rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm text-center space-y-10"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Crown + tagline */}
        <div className="space-y-4">
          <motion.div
            className="text-7xl block"
            animate={{
              filter: [
                'drop-shadow(0 0 8px rgba(255,215,0,0.35))',
                'drop-shadow(0 0 24px rgba(255,215,0,0.7))',
                'drop-shadow(0 0 8px rgba(255,215,0,0.35))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            👑
          </motion.div>

          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              Creator Podium
            </h1>
            <p className="text-slate-400 mt-2 text-lg font-medium">
              Own the Podium 👑
            </p>
          </div>

          <p className="text-slate-600 text-sm max-w-xs mx-auto leading-relaxed">
            Connect your Stripe, set your slug, and let fans compete
            for the top spot — live.
          </p>
        </div>

        {/* Google button + error */}
        <div className="space-y-4">
          <motion.button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4
                       bg-white hover:bg-slate-50 text-slate-900 font-semibold text-base
                       rounded-2xl transition-colors duration-150
                       shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_32px_rgba(0,0,0,0.5)]
                       disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {signingIn ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-slate-500">Redirecting to Google…</span>
              </>
            ) : (
              <>
                {/* Google "G" — official brand colours */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </motion.button>

          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-sm bg-red-950/50 border border-red-800/40
                           rounded-xl px-4 py-3"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <p className="text-slate-700 text-xs leading-relaxed">
          By signing in you agree to our terms of service.
          Fan-facing podium pages are always publicly accessible.
        </p>
      </motion.div>
    </div>
  );
}
