// v2
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

  const { data, error } = await supabase.rpc('get_personalized_feed', {
    viewer_id: session?.user?.id ?? null,
    sort_by: sort,
    filter_category: category,
    filter_format: format,
    page_limit: limit,
    page_offset: offset,
  })

  if (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) return NextResponse.json([])

  return NextResponse.json(data)
}
