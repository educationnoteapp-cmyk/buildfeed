'use client'

import { useState } from 'react'
import { Zap, Github, Chrome } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState<'github' | 'google' | null>(null)
  const supabase = createClient()

  const signIn = async (provider: 'github' | 'google') => {
    setLoading(provider)
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Zap size={22} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-text-main">BuildFeed</h1>
          <p className="text-muted text-sm mt-1">The discovery layer for builders</p>
        </div>

        {/* Auth card */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <p className="text-center text-sm text-muted mb-4">
            Sign in to start sharing your DevTools
          </p>

          <button
            onClick={() => signIn('github')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === 'github' ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Github size={18} />
            )}
            Continue with GitHub
          </button>

          <button
            onClick={() => signIn('google')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
          >
            {loading === 'google' ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Chrome size={18} />
            )}
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          By signing in you agree to our terms of service
        </p>
      </div>
    </div>
  )
}
