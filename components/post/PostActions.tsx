'use client'

import { useState, useEffect, useRef } from 'react'
import { Share2, MessageCircle, Play, ThumbsDown, Flag, ChevronDown } from 'lucide-react'
import WorkedButton from './WorkedButton'
import FollowButtonWrapper from '@/components/ui/FollowButtonWrapper'

interface Comment {
  id: string
  content: string
  profile?: { username: string; avatar_url?: string }
}

interface PostActionsProps {
  postId: string
  creatorId: string
  tryVideoUrl?: string | null
  websiteUrl?: string | null
  initialWorked?: boolean
  initialWorkedCount?: number
  initialDisliked?: boolean
  initialReported?: boolean
  initialIsFollowingCreator?: boolean
}

const REPORT_REASONS = [
  'תוכן לא רלוונטי לקהל מפתחים',
  'ספאם או מניפולציה',
  'מידע מטעה',
  'תוכן פוגעני',
  'אחר',
]

export default function PostActions({
  postId, creatorId, tryVideoUrl, websiteUrl,
  initialWorked = false, initialWorkedCount = 0,
  initialDisliked = false, initialReported = false,
  initialIsFollowingCreator = false,
}: PostActionsProps) {
  const [showTryVideo, setShowTryVideo] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showReportMenu, setShowReportMenu] = useState(false)
  const [isDisliked, setIsDisliked] = useState(initialDisliked)
  const [isReported, setIsReported] = useState(initialReported)
  const [sharing, setSharing] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Load comments lazily when panel opens
  useEffect(() => {
    if (!showComments || commentsLoaded) return
    fetch(`/api/comments?post_id=${postId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setComments(data) })
      .finally(() => setCommentsLoaded(true))
  }, [showComments, commentsLoaded, postId])

  const handleTry = () => {
    if (tryVideoUrl) setShowTryVideo(true)
    else if (websiteUrl) window.open(websiteUrl, '_blank')
    fetch('/api/post/interact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, action: 'view' }) })
  }

  const handleDislike = async () => {
    const res = await fetch('/api/post/interact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, action: 'dislike' }) })
    if (res.status === 401) { window.location.href = '/login'; return }
    const data = await res.json()
    if (typeof data.disliked === 'boolean') setIsDisliked(data.disliked)
  }

  const handleReport = async (reason: string) => {
    const res = await fetch('/api/post/interact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, action: 'report', reason }) })
    if (res.status === 401) { window.location.href = '/login'; return }
    setIsReported(true)
    setShowReportMenu(false)
  }

  const handleShare = async () => {
    setSharing(true)
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: document.title, url }).catch(() => {})
    else await navigator.clipboard.writeText(url).catch(() => {})
    fetch('/api/post/interact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postId, action: 'share' }) })
    setTimeout(() => setSharing(false), 1500)
  }

  const handleComment = async () => {
    if (!newComment.trim()) return
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, content: newComment.trim() }),
    })
    if (res.status === 401) { window.location.href = '/login'; return }
    const data = await res.json()
    if (data?.id) { setComments(prev => [...prev, data]); setNewComment('') }
  }

  return (
    <div className="space-y-3">
      {/* Try video modal */}
      {showTryVideo && tryVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowTryVideo(false)}>
          <div className="relative max-w-2xl w-full bg-background rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-medium text-text-main text-sm">Demo הפיצ׳ר</span>
              <button onClick={() => setShowTryVideo(false)} className="text-muted hover:text-text-main text-xl leading-none">×</button>
            </div>
            <video src={tryVideoUrl} autoPlay controls className="w-full aspect-video bg-black" />
            {websiteUrl && (
              <div className="p-4 flex justify-center">
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                  התחל להשתמש ←
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleTry}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <Play size={14} fill="white" />
          נסה את זה
        </button>

        <WorkedButton postId={postId} initialWorked={initialWorked} initialCount={initialWorkedCount} />

        <button onClick={() => { setShowComments(s => !s); setTimeout(() => commentInputRef.current?.focus(), 100) }}
          className="flex items-center gap-2 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 px-3 py-2.5 rounded-xl transition-colors">
          <MessageCircle size={14} />
          תגובה {comments.length > 0 && <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{comments.length}</span>}
        </button>

        <button onClick={handleShare}
          className="flex items-center gap-2 text-sm text-muted hover:text-text-main border border-border hover:border-white/20 px-3 py-2.5 rounded-xl transition-colors">
          <Share2 size={14} />
          {sharing ? '✓ הועתק' : 'שתף'}
        </button>

        <FollowButtonWrapper targetId={creatorId} type="creator" size="sm" initialIsFollowing={initialIsFollowingCreator} />

        <div className="mr-auto flex items-center gap-1.5">
          <button onClick={handleDislike} title="לא רלוונטי"
            className={'flex items-center gap-1 text-xs px-2.5 py-2 rounded-xl border transition-colors ' + (isDisliked ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-border text-muted hover:border-red-500/30 hover:text-red-400')}>
            <ThumbsDown size={13} />
          </button>

          <div className="relative">
            <button onClick={() => setShowReportMenu(s => !s)} disabled={isReported}
              title={isReported ? 'דווחת על הפוסט הזה' : 'דווח'}
              className={'flex items-center gap-1 text-xs px-2.5 py-2 rounded-xl border transition-colors ' + (isReported ? 'border-border text-muted/40 cursor-not-allowed' : 'border-border text-muted hover:border-orange-500/30 hover:text-orange-400')}>
              <Flag size={13} />
              <ChevronDown size={10} />
            </button>

            {showReportMenu && !isReported && (
              <div className="absolute left-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl overflow-hidden z-30 shadow-xl">
                <p className="text-xs text-muted px-3 py-2 border-b border-border">סיבת הדיווח:</p>
                {REPORT_REASONS.map(reason => (
                  <button key={reason} onClick={() => handleReport(reason)}
                    className="w-full text-right text-xs text-text-main hover:bg-white/5 px-3 py-2.5 transition-colors">
                    {reason}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {comments.length > 0 && (
            <div className="divide-y divide-border max-h-48 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 overflow-hidden">
                    {c.profile?.avatar_url && <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-text-main">{c.profile?.username}</span>
                    <p className="text-sm text-muted mt-0.5 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {comments.length === 0 && commentsLoaded && (
            <p className="text-xs text-muted text-center py-6">אין תגובות עדיין — היה הראשון!</p>
          )}
          <div className="flex items-center gap-2 p-3 border-t border-border">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0" />
            <input ref={commentInputRef} value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
              placeholder="הוסף תגובה..."
              className="flex-1 bg-transparent text-sm text-text-main placeholder-muted focus:outline-none" />
            {newComment && <button onClick={handleComment} className="text-xs text-primary font-medium hover:text-secondary transition-colors">שלח</button>}
          </div>
        </div>
      )}
    </div>
  )
}
