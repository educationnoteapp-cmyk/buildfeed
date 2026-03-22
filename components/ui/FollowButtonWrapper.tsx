'use client'

import dynamic from 'next/dynamic'

const FollowButton = dynamic(() => import('./FollowButton'), { ssr: false })

export default function FollowButtonWrapper({ targetId, type, size, initialIsFollowing }: {
  targetId: string
  type: 'creator' | 'product'
  size?: 'sm' | 'md'
  initialIsFollowing?: boolean
}) {
  return <FollowButton targetId={targetId} type={type} size={size} initialIsFollowing={initialIsFollowing} />
}
