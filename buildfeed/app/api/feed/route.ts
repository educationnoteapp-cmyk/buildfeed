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

  const { data, error } = await supabase.rpc('get_personalized_feed', {
    viewer_id: null,
    sort_by: sort,
    filter_category: category,
    filter_format: format,
    page_limit: limit,
    page_offset: offset,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json([])

  const postIds = data.map((p: { id: string }) => p.id)
  const { data: enriched } = await supabase
    .from('posts')
    .select('id, slides(id,position,slide_type,image_url,audio_url,audio_duration_seconds,code_content,code_language,hotspot_url,hotspot_x,hotspot_y,hotspot_label,slide_duration_seconds)')
    .in('id', postIds)

  const slidesMap = Object.fromEntries((enriched ?? []).map((p: any) => [p.id, (p.slides ?? []).sort((a: any, b: any) => a.position - b.position)]))

  const result = data.map((p: any) => ({
    ...p,
    slides: slidesMap[p.id] ?? [],
    creator: { id: p.creator_id, username: p.creator_username, display_name: p.creator_display_name, avatar_url: p.creator_avatar_url },
    product: p.product_id ? { id: p.product_id, name: p.product_name, logo_url: p.product_logo_url, website_url: p.product_website_url } : null,
  }))

  return NextResponse.json(result)
}
