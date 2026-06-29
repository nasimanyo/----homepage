export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  points: number
  last_login_bonus_date: string | null
  last_roulette_date: string | null
  is_admin: boolean
  created_at: string
}

export type Announcement = {
  id: string
  author_id: string | null
  title: string
  body: string | null
  kind: 'info' | 'poll_started' | 'event'
  ref_id: string | null
  created_at: string
  profiles?: Profile
}

export type Poll = {
  id: string
  created_by: string | null
  title: string
  description: string | null
  status: 'open' | 'closed'
  decided_at: string | null
  created_at: string
  poll_options?: PollOption[]
}

export type PollOption = {
  id: string
  poll_id: string
  candidate_date: string
  sort_order: number
  votes?: Vote[]
}

export type Vote = {
  id: string
  option_id: string
  voter_id: string
  answer: 'ok' | 'ng' | 'maybe'
  created_at: string
  profiles?: Profile
}

export type InfoPost = {
  id: string
  author_id: string | null
  title: string
  body: string | null
  kind: 'memo' | 'place' | 'link'
  url: string | null
  created_at: string
  profiles?: Profile
}
