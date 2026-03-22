import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('player_mode, mute_by_default, notify_followers, notify_comments, notify_trending')
    .eq('id', user.id)
    .single()

  const initialSettings = {
    player_mode: (data?.player_mode ?? 'auto') as 'auto' | 'manual',
    mute_by_default: data?.mute_by_default ?? false,
    notify_followers: data?.notify_followers ?? true,
    notify_comments: data?.notify_comments ?? true,
    notify_trending: data?.notify_trending ?? true,
  }

  return <SettingsClient initialSettings={initialSettings} />
}
