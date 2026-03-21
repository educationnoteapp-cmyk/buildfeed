import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, title, format, category, productTypes, tags, slideCount, slides, productName, productTagline, productUrl, versionTags, githubUrl } = body

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    const userId = session.user.id

    // Create product if needed
    let productId = null
    if (productName) {
      const { data: prod } = await supabase
        .from('products')
        .insert({
          creator_id: userId,
          name: productName,
          tagline: productTagline || null,
          website_url: productUrl || null,
        })
        .select('id')
        .single()
      productId = prod?.id ?? null
    }

    // Upsert the post
    const { error: postError } = await supabase.from('posts').upsert({
      id: postId,
      creator_id: userId,
      product_id: productId,
      title: title || 'טיוטה ללא כותרת',
      format: format || 'snap',
      category: category || 'devtools',
      product_types: productTypes || [],
      tags: tags || [],
      version_tags: versionTags || [],
      github_url: githubUrl || null,
      status: 'draft',
      slide_count: slideCount || 0,
    })

    if (postError) {
      console.error('Post upsert error:', postError)
      return NextResponse.json({ error: postError.message }, { status: 500 })
    }

    // Upsert slides if provided
    if (slides && slides.length > 0) {
      for (const slide of slides) {
        const { error: slideError } = await supabase.from('slides').upsert({
          id: slide.id,
          post_id: postId,
          position: slide.position,
          slide_type: slide.slide_type || 'media',
          image_url: slide.image_url,
          audio_url: slide.audio_url || null,
          audio_duration_seconds: slide.audio_duration_seconds || null,
          slide_duration_seconds: slide.slide_duration_seconds || 3,
          code_content: slide.code_content || null,
          code_language: slide.code_language || null,
          hotspot_url: slide.hotspot_url || null,
        })
        if (slideError) console.error('Slide upsert error:', slideError)
      }

      // Update slide count
      await supabase.from('posts').update({ slide_count: slides.length }).eq('id', postId)
    }

    return NextResponse.json({ success: true, postId, productId })
  } catch (err: any) {
    console.error('Create post error:', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}

// Also handle publishing
export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, ...updates } = body

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .eq('creator_id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
