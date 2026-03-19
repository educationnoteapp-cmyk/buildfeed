export type SlideType = 'media' | 'code' | 'hotspot'
export type PostFormat = 'snap' | 'demo'
export type PostStatus = 'draft' | 'published'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  github_url: string | null
  twitter_url: string | null
  primary_category: string | null
  stack_tags: string[] | null
  created_at: string
  updated_at?: string
}

export interface Product {
  id: string
  creator_id: string
  name: string
  tagline: string | null
  website_url: string | null
  logo_url: string | null
  created_at: string
}

export interface Post {
  id: string
  creator_id: string
  product_id: string
  title: string
  format: PostFormat
  category: string
  product_types: string[] | null
  tags: string[] | null
  status: PostStatus
  slide_count: number
  view_count: number
  sandbox_opens: number
  link_clicks: number
  published_at: string | null
  created_at: string
  updated_at?: string
  creator?: Profile
  product?: Product
  slides?: Slide[]
}

export interface Slide {
  id: string
  post_id: string
  position: number
  slide_type: SlideType
  image_url: string | null
  audio_url: string | null
  audio_duration_seconds: number | null
  code_content: string | null
  code_language: string | null
  hotspot_url: string | null
  created_at: string
  updated_at?: string
}

export const CATEGORIES = [
  { id: 'ai-agents',  label: '⚡ AI & Agents' },
  { id: 'auth',       label: '🔐 Auth & Security' },
  { id: 'payments',   label: '💳 Payments & Billing' },
  { id: 'analytics',  label: '📊 Analytics & Monitoring' },
  { id: 'email',      label: '📧 Email & Notifications' },
  { id: 'devtools',   label: '🛠 DevTools & APIs' },
  { id: 'data',       label: '🗄 Data & Storage' },
] as const

export const PRODUCT_TYPES = [
  { id: 'plug-play',   label: '🔌 Plug & Play' },
  { id: 'sdk',         label: '📦 SDK / Library' },
  { id: 'api-first',   label: '🔗 API-First' },
  { id: 'self-hosted', label: '⚙️ Self-Hosted' },
  { id: 'open-source', label: '🌐 Open Source' },
] as const
