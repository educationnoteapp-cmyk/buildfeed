'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUp, X, Play, CheckCircle2, MessageCircle, Share2, ThumbsDown, Flag, AlertTriangle, Github, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WorkedButton from '@/components/post/WorkedButton'

interface PlayerActionsMenuProps {
  postId: string
  creatorId: string
  tryVideoUrl?: string | null
  websiteUrl?: string | null
  githubUrl?: string | null
  onPause: () => void
  onResume: () => void
}

const REPORT_REASONS = [
  'תוכן שיווקי ולא טכני',
  'ספאם',
  'מידע מטעה',
  'אחר',
]

export default function PlayerActionsMenu({
  postId, creatorId, tryVideoUrl, websiteUrl, githubUrl, onPause, onResume
}: PlayerActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [showReportReasons, setShowReportReasons] = useState(false)
  const [showTryVideo, setShowTryVideo] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isReported, setIsReported] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (!session) return
      const [{ data: dislike }, { data: report }] = await Promise.all([
        supabase.from('post_dislikes').select('user_id').eq('user_id', session.user.id).eq('post_id', postId).single(),
        supabase.from('post_reports').select('id').eq('user_id', session.user.id).eq('post_id', postId).single(),
      ])
      setIsDisliked(!!dislike)
      setIsReported(!!report)
    }
    init()
  }, [postId, supabase])

  const openMenu = () => { setOpen(true); onPause() }
  const closeMenu = () => { setOpen(false); setShowReportReasons(false); onResume() }

  const handleTry = () => {
    if (tryVideoUrl) { setShowTryVideo(true) }
    else if (websiteUrl) { window.open(websiteUrl, '_blank') }
  }

  const handleDislike = async () => {
    if (!session) { window.location.href = '/login'; return }
    await fetch('/api/post/interact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, action: 'dislike' })
    })
    setIsDisliked(d => !d)
  }

  const handleReport = async (reason: string) => {
    if (!session) { window.location.href = '/login'; return }
    await fetch('/api/post/interact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, action: 'report', reason })
    })
    setIsReported(true)
    setShowReportReasons(false)
  }

  const handleShare = async () => {
    setSharing(true)
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: document.title, url }).catch(() => {})
    else await navigator.clipboard.writeText(url).catch(() => {})
    setTimeout(() => setSharing(false), 1500)
  }

  return (
    <>
      {/* Try video modal */}
      {showTryVideo && tryVideoUrl && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setShowTryVideo(false)}>
          <div className="relative w-full max-w-lg bg-background rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-sm font-medium text-text-main">Demo הפיצ׳ר</span>
              <button onClick={() => setShowTryVideo(false)} className="text-muted text-lg leading-none">×</button>
            </div>
            <video src={tryVideoUrl} autoPlay controls className="w-full aspect-video bg-black" />
            {websiteUrl && (
              <div className="p-3 flex justify-center">
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
                  התחל להשתמש ←
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trigger button — חץ בפינה */}
      {!open && (
        <button
          onClick={openMenu}
          className="absolute bottom-10 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          title="פעולות"
        >
          <ChevronUp size={16} />
        </button>
      )}

      {/* Menu overlay */}
      {open && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end" ref={menuRef}>
          {/* Dimmed backdrop — לחיצה סוגרת */}
          <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />

          {/* Menu panel */}
          <div className="relative bg-[#13131A] border-t border-white/10 rounded-t-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium text-text-main">פעולות</span>
              <button onClick={closeMenu} className="w-7 h-7 flex items-center justify-center text-muted hover:text-text-main">
                <X size={15} />
              </button>
            </div>

            {!showReportReasons ? (
              <div className="py-1">
                {/* נסה */}
                <button onClick={handleTry}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-right">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <Play size={15} className="text-white" fill="white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-main">נסה את זה</p>
                    <p className="text-xs text-muted">צפה ב-demo של הפיצ׳ר</p>
                  </div>
                </button>

                {/* עבד לי */}
                <div className="px-4 py-2">
                  <WorkedButton postId={postId} />
                </div>

                {/* שתף */}
                <button onClick={handleShare}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-right">
                  <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Share2 size={15} className="text-muted" />
                  </div>
                  <p className="text-sm text-text-main">{sharing ? '✓ הועתק!' : 'שתף'}</p>
                </button>

                {/* GitHub */}
                {githubUrl && (
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                      <Github size={15} className="text-muted" />
                    </div>
                    <p className="text-sm text-text-main">פתח GitHub</p>
                  </a>
                )}

                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                      <ExternalLink size={15} className="text-muted" />
                    </div>
                    <p className="text-sm text-text-main">בקר באתר</p>
                  </a>
                )}

                <div className="h-px bg-white/6 mx-4 my-1" />

                {/* דיסלייק */}
                <button onClick={handleDislike}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-right">
                  <div className={'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ' + (isDisliked ? 'bg-red-500/20' : 'bg-white/8')}>
                    <ThumbsDown size={15} className={isDisliked ? 'text-red-400' : 'text-muted'} />
                  </div>
                  <p className={'text-sm ' + (isDisliked ? 'text-red-400' : 'text-text-main')}>
                    {isDisliked ? 'בטל דיסלייק' : 'לא רלוונטי'}
                  </p>
                </button>

                {/* דווח */}
                <button
                  onClick={() => !isReported && setShowReportReasons(true)}
                  disabled={isReported}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-right disabled:opacity-50 mb-2"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Flag size={15} className={isReported ? 'text-orange-400' : 'text-muted'} />
                  </div>
                  <p className="text-sm text-text-main">{isReported ? '✓ דווח' : 'דווח על פוסט'}</p>
                </button>
              </div>
            ) : (
              <div className="py-1">
                <button onClick={() => setShowReportReasons(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-muted hover:text-text-main transition-colors">
                  ← חזרה
                </button>
                <p className="text-xs text-muted px-4 pb-2">בחר סיבה:</p>
                {REPORT_REASONS.map(reason => (
                  <button key={reason} onClick={() => handleReport(reason)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-right">
                    <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />
                    <p className="text-sm text-text-main">{reason}</p>
                  </button>
                ))}
                <div className="pb-2" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
