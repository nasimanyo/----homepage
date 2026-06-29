import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { action } = await request.json() as { action?: string }
  if (!action || !['login_bonus', 'roulette'].includes(action)) {
    return NextResponse.json({ error: '不正なアクションです' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points, last_login_bonus_date, last_roulette_date')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'プロフィールの取得に失敗しました' }, { status: 500 })
  }

  if (action === 'login_bonus') {
    if (profile.last_login_bonus_date === today) {
      return NextResponse.json({ error: '今日のログインボーナスはすでに受け取り済みです' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({
        points: profile.points + 1,
        last_login_bonus_date: today,
      })
      .eq('id', user.id)
      .select('points')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'ポイントの更新に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ points: data.points })
  }

  if (profile.last_roulette_date === today) {
    return NextResponse.json({ error: '今日のルーレットはすでにプレイ済みです' }, { status: 400 })
  }

  const spin = Math.floor(Math.random() * 100) + 1
  const { data, error } = await supabase
    .from('profiles')
    .update({
      points: profile.points + spin,
      last_roulette_date: today,
    })
    .eq('id', user.id)
    .select('points')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'ポイントの更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ points: data.points, spin })
}
