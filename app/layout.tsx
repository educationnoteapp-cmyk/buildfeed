import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BuildFeed — Discovery for Builders',
  description: 'The Discovery Layer for B2B DevTools. Smart Audio-Slides demos by developers, for developers.',
}

import BottomNav from '@/components/ui/BottomNav'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-text tracking-tight">
                Build<span className="text-primary">Feed</span>
              </span>
              <span className="text-xs text-muted bg-surface border border-border px-1.5 py-0.5 rounded-md">beta</span>
            </a>
            <nav className="flex items-center gap-3">
              <a href="/login" className="text-sm text-muted hover:text-text transition-colors">Sign in</a>
              <a href="/studio" className="text-sm px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Studio →
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
