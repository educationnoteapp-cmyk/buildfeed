// POST /api/dashboard/creator
// Creates or updates the creator row for the authenticated user.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await req.json() as { slug: string };

  const { data: existing } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from('creators')
      .update({ slug })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ creator: updated });
  }

  const { data: created, error } = await supabaseAdmin
    .from('creators')
    .insert({ auth_user_id: user.id, slug })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ creator: created });
}
