import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = new URLSearchParams()
  params.set('sort', searchParams.get('sort') ?? 'smart')
  params.set('limit', searchParams.get('limit') ?? '24')
  params.set('offset', searchParams.get('offset') ?? '0')
  if (searchParams.get('category')) params.set('category', searchParams.get('category')!)
  if (searchParams.get('format')) params.set('format', searchParams.get('format')!)

  const res = await fetch(
    'https://jmlasthxrnjecedsacme.supabase.co/functions/v1/feed?' + params.toString()
  )
  const data = await res.json()
  return NextResponse.json(data)
} 
