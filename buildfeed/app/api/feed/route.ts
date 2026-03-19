import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const format = searchParams.get('format')
  const sort = searchParams.get('sort') ?? 'smart'
  const limit = parseInt(searchParams.get('limit') ?? '12')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Get user's preferred stacks
  let preferredStacks: string[] = []
  if (session?.user?.id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('preferred_stacks')
      .eq('id', session.user.id)
      .single()
    preferredStacks = prof?.preferred_stacks ?? []
  }

  const { data, error } = await supabase.rpc('get_personalized_feed', {
    p_user_id: session?.user?.id ?? null,
    p_category: category,
    p_format: format,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // שליפת slides + creator + product בנפרד
  const postIds = (data ?? []).map((p: { id: string }) => p.id)
  if (postIds.length === 0) return NextResponse.json([])

  const { data: enriched } = await supabase
    .from('posts')
    .select('id, creator:profiles(id,username,display_name,avatar_url), product:products(id,name,tagline), slides(id,position,slide_type,image_url,audio_url,audio_duration_seconds,code_content,code_language,hotspot_url,hotspot_x,hotspot_y,hotspot_label,slide_duration_seconds)')
    .in('id', postIds)

  const enrichedMap = Object.fromEntries((enriched ?? []).map((p: { id: string }) => [p.id, p]))

  const result = (data ?? []).map((p: { id: string }) => ({
    ...p,
    ...(enrichedMap[p.id] ?? {}),
    slides: ((enrichedMap[p.id] as { slides?: { position: number }[] })?.slides ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  }))

  return NextResponse.json(result)
}
