import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('post_id')
  if (!postId) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })

  const supabase = createClient()
  const { data } = await supabase
    .from('comments')
    .select('*, profile:profiles(username,avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id, content } = await req.json()
  if (!post_id || !content?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id, user_id: user.id, content: content.trim() })
    .select('*, profile:profiles(username,avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
