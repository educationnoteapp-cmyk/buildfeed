import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { post_id, event_type, viewer_id } = await req.json()

    if (!post_id || !event_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createClient()
    await supabase.from('analytics_events').insert({
      post_id,
      event_type,
      viewer_id: viewer_id ?? null,
    })

    // עדכון counter על הpost
    const counterField = {
      view: 'view_count',
      sandbox_open: 'sandbox_opens',
      link_click: 'link_clicks',
    }[event_type as string]

    if (counterField) {
      await supabase.rpc('increment_counter', {
        table_name: 'posts',
        row_id: post_id,
        column_name: counterField,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
