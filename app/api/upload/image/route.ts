import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
 
function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}
 
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const postId = formData.get('postId') as string | null
    const slideId = formData.get('slideId') as string | null
 
    if (!file || !postId || !slideId) {
      return NextResponse.json({ error: 'Missing file, postId or slideId' }, { status: 400 })
    }
 
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.type === 'image/gif' ? 'gif' : 'webp'
    const key = `posts/${postId}/slides/${slideId}/image.${ext}`
 
    const s3 = getS3Client()
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'buildfeed-media',
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }))
 
    const url = `${process.env.R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ url, key })
  } catch (err: any) {
    console.error('Image upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
 
