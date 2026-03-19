import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminActions from './AdminActions'
import AdminEmails from './AdminEmails'
import CreatorLimit from './CreatorLimit'
import CreatorHistory from './CreatorHistory'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // בדוק שזה מנהל
  const { data: profile } = await supabase
    .from('profiles')
    .select('trust_level, username')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.trust_level !== 99) redirect('/')

  // פוסטים מוסתרים
  const { data: hiddenPosts } = await supabase
    .from('posts')
    .select('*, creator:profiles(username, avatar_url)')
    .not('hidden_at', 'is', null)
    .order('hidden_at', { ascending: false })
    .limit(20)

  // יוצרים עם דיווחים
  const { data: reportedCreators } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, warning_count, is_suspended, suspended_until')
    .gt('warning_count', 0)
    .order('warning_count', { ascending: false })
    .limit(20)

  // רשימת המתנה
  const { data: waitlist } = await supabase
    .from('creator_waitlist')
    .select('id, email, created_at, user_id, approved_at')
    .is('approved_at', null)
    .order('created_at', { ascending: true })
    .limit(20)

  // סטטיסטיקות
  const [{ count: totalPosts }, { count: totalUsers }, { count: hiddenCount }, { count: reportCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).not('hidden_at', 'is', null),
    supabase.from('post_reports').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted hover:text-text-main text-sm">← BuildFeed</Link>
            <span className="text-border">/</span>
            <span className="text-text-main text-sm font-medium">Admin Panel</span>
          </div>
          <span className="text-xs text-muted">@{profile.username}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'פוסטים פעילים', value: totalPosts ?? 0 },
            { label: 'משתמשים', value: totalUsers ?? 0 },
            { label: 'פוסטים מוסתרים', value: hiddenCount ?? 0, alert: (hiddenCount ?? 0) > 0 },
            { label: 'דיווחים כולל', value: reportCount ?? 0 },
          ].map(s => (
            <div key={s.label} className={'bg-surface border rounded-xl p-4 text-center ' + (s.alert ? 'border-amber-400/30 bg-amber-400/5' : 'border-border')}>
              <p className={'text-2xl font-bold ' + (s.alert ? 'text-amber-400' : 'text-text-main')}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Hidden posts */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
            פוסטים מוסתרים לבדיקה
            {(hiddenCount ?? 0) > 0 && <span className="mr-2 text-amber-400">⚠ {hiddenCount}</span>}
          </h2>
          {(hiddenPosts?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted text-sm border border-border rounded-xl">אין פוסטים מוסתרים ✓</div>
          ) : (
            <div className="space-y-2">
              {hiddenPosts?.map(post => (
                <div key={post.id} className="bg-surface border border-amber-400/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-main truncate">{post.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      @{post.creator?.username} · {post.report_count} דיווחים · הוסתר {new Date(post.hidden_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/post/${post.id}`} className="text-xs text-muted hover:text-text-main border border-border px-2.5 py-1.5 rounded-lg transition-colors">
                      צפה
                    </Link>
                    <AdminActions postId={post.id} creatorId={post.creator_id} action="restore" label="שחזר" className="text-xs text-green-400 border border-green-400/30 hover:bg-green-400/10 px-2.5 py-1.5 rounded-lg transition-colors" />
                    <AdminActions postId={post.id} creatorId={post.creator_id} action="confirm_hide" label="הסר לצמיתות" className="text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 px-2.5 py-1.5 rounded-lg transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Flagged creators */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">יוצרים עם אזהרות</h2>
          {(reportedCreators?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted text-sm border border-border rounded-xl">אין יוצרים מדווחים ✓</div>
          ) : (
            <div className="space-y-2">
              {reportedCreators?.map(creator => (
                <div key={creator.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 overflow-hidden flex-shrink-0">
                    {creator.avatar_url && <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-main">@{creator.username}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {creator.warning_count} אזהרות
                      {creator.is_suspended && <span className="text-red-400 mr-2">· מושעה עד {new Date(creator.suspended_until).toLocaleDateString('he-IL')}</span>}
                    </p>
                    <CreatorHistory creatorId={creator.id} creatorName={creator.username} />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/creator/${creator.username}`} className="text-xs text-muted border border-border px-2.5 py-1.5 rounded-lg hover:text-text-main transition-colors">
                      פרופיל
                    </Link>
                    {!creator.is_suspended && (
                      <AdminActions creatorId={creator.id} action="suspend_7" label="השעה 7 ימים" className="text-xs text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 px-2.5 py-1.5 rounded-lg transition-colors" />
                    )}
                    <AdminActions creatorId={creator.id} action="suspend_30" label="השעה 30 ימים" className="text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 px-2.5 py-1.5 rounded-lg transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Waitlist */}
        {(waitlist?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
              רשימת המתנה
              <span className="text-amber-400 mr-2">{waitlist?.length} ממתינים</span>
            </h2>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {waitlist?.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs text-muted font-mono w-6">#{i+1}</span>
                    <span className="flex-1 text-sm text-text-main" dir="ltr">{w.email}</span>
                    <span className="text-xs text-muted">{new Date(w.created_at).toLocaleDateString('he-IL')}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Creator limit */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">מגבלת יוצרים</h2>
          <CreatorLimit adminId={session.user.id} />
        </section>

        {/* Manage admins */}
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">ניהול מנהלים</h2>
          <AdminEmails adminId={session.user.id} />
        </section>

      </main>
    </div>
  )
}
