import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: toggle follow
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_id, type } = await req.json() // type: 'creator' | 'product'
  const table = type === 'creator' ? 'follows_creators' : 'follows_products'
  const column = type === 'creator' ? 'following_id' : 'product_id'

  const { data: existing } = await supabase
    .from(table).select('follower_id')
    .eq('follower_id', user.id).eq(column, target_id).maybeSingle()

  if (existing) {
    await supabase.from(table).delete().eq('follower_id', user.id).eq(column, target_id)
    return NextResponse.json({ following: false })
  } else {
    await supabase.from(table).insert({ follower_id: user.id, [column]: target_id })
    return NextResponse.json({ following: true })
  }
}
