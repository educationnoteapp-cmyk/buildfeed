import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { post_id, action, reason } = await req.json()
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  switch (action) {
    case 'view':
      await supabase.rpc('mark_post_viewed', { p_user_id: userId, p_post_id: post_id })
      return NextResponse.json({ success: true })

    case 'dislike': {
      const { data: existing } = await supabase
        .from('post_dislikes').select('user_id')
        .eq('user_id', userId).eq('post_id', post_id).single()

      if (existing) {
        await supabase.from('post_dislikes').delete().eq('user_id', userId).eq('post_id', post_id)
        await supabase.rpc('decrement_counter', { table_name: 'posts', column_name: 'dislike_count', row_id: post_id })
        return NextResponse.json({ disliked: false })
      } else {
        await supabase.from('post_dislikes').insert({ user_id: userId, post_id })
        await supabase.rpc('increment_counter', { table_name: 'posts', column_name: 'dislike_count', row_id: post_id })
        return NextResponse.json({ disliked: true })
      }
    }

    case 'report': {
      const result = await supabase.rpc('report_post', {
        p_user_id: userId,
        p_post_id: post_id,
        p_reason: reason ?? null,
      })
      return NextResponse.json(result.data)
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
