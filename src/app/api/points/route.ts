import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function resolveUser(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken)
    if (error) {
      console.error('auth getUser(bearer) error', error)
      return null
    }
    return user
  }

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  const { action } = await request.json() as { action?: string }
  if (!action || !['login_bonus', 'roulette'].includes(action)) {
    return NextResponse.json({ error: '不正なアクションです' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const user = await resolveUser(supabase, request)
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
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました', detail: profileError.message },
      { status: 500 },
    )
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
      return NextResponse.json(
        { error: 'プロフィールの作成に失敗しました', detail: insertError?.message },
        { status: 500 },
      )
    }

    profile = insertedProfile
  }

  const currentPoints = profile.points ?? 0

  if (action === 'login_bonus') {
    if (profile.last_login_bonus_date === today) {
      return NextResponse.json({ error: '今日のログインボーナスはすでに受け取り済みです' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({
        points: currentPoints + 1,
        last_login_bonus_date: today,
      })
      .eq('id', user.id)
      .select('points')
      .single()

    if (error || !data) {
      console.error('login bonus update error', error)
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
      points: currentPoints + spin,
      last_roulette_date: today,
    })
    .eq('id', user.id)
    .select('points')
    .single()

  if (error || !data) {
    console.error('roulette update error', error)
    return NextResponse.json({ error: 'ポイントの更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ points: data.points, spin })
}
