import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH — update player/notification settings
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patch = await req.json()
  const allowed = ['player_mode', 'mute_by_default', 'notify_followers', 'notify_comments', 'notify_trending']
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)))

  const { error } = await supabase.from('profiles').update(safe).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — delete account (posts + profile; auth user stays until next sign-in)
export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete posts first (FK), then profile
  await supabase.from('posts').delete().eq('creator_id', user.id)
  const { error } = await supabase.from('profiles').delete().eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
