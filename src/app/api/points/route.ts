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
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points, last_login_bonus_date, last_roulette_date')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('profile query error', profileError)
    return NextResponse.json({ error: 'プロフィールの取得に失敗しました' }, { status: 500 })
  }

  if (!profile) {
    const defaultName = user.email?.split('@')[0] || 'ユーザー'
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: defaultName,
        points: 0,
        last_login_bonus_date: null,
        last_roulette_date: null,
      })
      .select('points, last_login_bonus_date, last_roulette_date')
      .single()

    if (insertError || !insertedProfile) {
      console.error('profile insert error', insertError)
      return NextResponse.json({ error: 'プロフィールの作成に失敗しました' }, { status: 500 })
    }

    profile = insertedProfile
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
