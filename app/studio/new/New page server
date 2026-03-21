import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewPostClient from './NewPostClient'

export default async function NewPostPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) redirect('/login')

  return <NewPostClient userId={session.user.id} />
}
