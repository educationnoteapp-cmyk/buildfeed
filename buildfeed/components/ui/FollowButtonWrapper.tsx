'use client'

import dynamic from 'next/dynamic'

const FollowButton = dynamic(() => import('./FollowButton'), { ssr: false })

export default function FollowButtonWrapper({ targetId, type, size }: {
  targetId: string
  type: 'creator' | 'product'
  size?: 'sm' | 'md'
}) {
  return <FollowButton targetId={targetId} type={type} size={size} />
}
