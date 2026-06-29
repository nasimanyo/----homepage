'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Announcement, Poll, Profile } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarDays,
  Heart,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const kindConfig = {
  info: { icon: Info, color: 'text-blue-600 bg-blue-50', label: 'お知らせ' },
  poll_started: { icon: CalendarDays, color: 'text-violet-600 bg-violet-50', label: '予定合わせ開始' },
  event: { icon: Bell, color: 'text-emerald-600 bg-emerald-50', label: 'イベント' },
}

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rouletteLoading, setRouletteLoading] = useState(false)
  const [pointNotice, setPointNotice] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [memoSaved, setMemoSaved] = useState(false)
  const [recentPages, setRecentPages] = useState<Array<{ href: string; label: string }>>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [countdown, setCountdown] = useState<{ title: string; dateLabel: string; remaining: string } | null>(null)

  const hasLoadedAnnouncementsRef = useRef(false)
  const lastNotifiedIdsRef = useRef<string[]>([])
  const supabase = typeof window === 'undefined' ? null : createClient()

  useEffect(() => {
    if (!supabase) return

    fetchAnnouncements()
    loadCountdown()

    const savedMemo = window.localStorage.getItem('home-memo')
    if (savedMemo) {
      setMemo(savedMemo)
    }

    const storedRecentPages = window.localStorage.getItem('recent-pages')
    if (storedRecentPages) {
      try {
        const parsed = JSON.parse(storedRecentPages) as Array<{ href: string; label: string }>
        setRecentPages(parsed.filter((page) => page.href !== '/home'))
      } catch {
        setRecentPages([])
      }
    }

    const storedFavorites = window.localStorage.getItem('home-favorites')
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites) as string[])
      } catch {
        setFavorites([])
      }
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserEmail(user?.email || null)
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      }
    })

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(window.Notification.permission)
    }

    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function fetchAnnouncements() {
    if (!supabase) return

    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(20)

    const nextAnnouncements = (data as Announcement[]) || []
    setAnnouncements(nextAnnouncements)
    setLoading(false)

    if (hasLoadedAnnouncementsRef.current && notificationPermission === 'granted' && nextAnnouncements.length > 0) {
      const latest = nextAnnouncements[0]
      if (!lastNotifiedIdsRef.current.includes(String(latest.id))) {
        new Notification('新しいお知らせ', {
          body: latest.title,
          icon: '/favicon.ico',
        })
        lastNotifiedIdsRef.current = [String(latest.id), ...lastNotifiedIdsRef.current].slice(0, 5)
      }
    }

    hasLoadedAnnouncementsRef.current = true
  }

  async function loadCountdown() {
    if (!supabase) return

    const { data } = await supabase
      .from('polls')
      .select('*, poll_options(id, candidate_date)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    const polls = (data as Poll[]) || []
    const candidates = polls.flatMap((poll) =>
      (poll.poll_options || []).map((option) => ({
        title: poll.title,
        candidateDate: option.candidate_date,
      })),
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = candidates
      .filter((candidate) => new Date(`${candidate.candidateDate}T00:00:00`) >= today)
      .sort(
        (a, b) =>
          new Date(`${a.candidateDate}T00:00:00`).getTime() - new Date(`${b.candidateDate}T00:00:00`).getTime(),
      )

    if (upcoming.length > 0) {
      const target = new Date(`${upcoming[0].candidateDate}T00:00:00`)
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000)
      const remaining = diffDays === 0 ? '今日です' : diffDays === 1 ? '明日' : `${diffDays}日後`
      setCountdown({
        title: upcoming[0].title,
        dateLabel: `${target.getMonth() + 1}/${target.getDate()}`,
        remaining,
      })
    } else {
      setCountdown(null)
    }
  }

  async function requestNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const permission = await window.Notification.requestPermission()
    setNotificationPermission(permission)

    if (permission === 'granted') {
      new Notification('通知を受け取れるようになりました', {
        body: userEmail ? `${userEmail} に届くように準備しました。` : '新しい情報をすぐお知らせします。',
        icon: '/favicon.ico',
      })
    }
  }

  async function handleRoulette() {
    if (!supabase || rouletteLoading) return
    setPointNotice(null)
    setRouletteLoading(true)

    const response = await fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'roulette' }),
    })
    const data = await response.json()

    if (!response.ok) {
      setPointNotice(data?.error || 'ルーレットの取得に失敗しました')
      setRouletteLoading(false)
      return
    }

    setPointNotice(`ルーレットで ${data.spin}pt を獲得しました！`)
    setProfile((prev) =>
      prev ? { ...prev, points: data.points, last_roulette_date: new Date().toISOString().split('T')[0] } : prev,
    )
    setRouletteLoading(false)
  }

  function saveMemo() {
    window.localStorage.setItem('home-memo', memo)
    setMemoSaved(true)
    window.setTimeout(() => setMemoSaved(false), 1600)
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((favoriteId) => favoriteId !== id)
      : [...favorites, id]

    setFavorites(next)
    window.localStorage.setItem('home-favorites', JSON.stringify(next))
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-slate-950/5 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600">つくたべメンバー</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">マイホーム</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">今日のポイント、お知らせ、ルーレットまで。全てこの画面でサクッと確認できます。</p>
          </div>
          <div className="flex items-center gap-3 rounded-3xl bg-slate-900 px-4 py-3 text-white shadow-lg shadow-slate-900/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-500 text-white shadow-inner shadow-violet-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">本日のステータス</p>
              <p className="text-sm font-semibold">{today}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 rounded-[40px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.3)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-violet-600">こんにちは</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">{profile?.display_name ? `${profile.display_name} さん` : 'ゲストさん'}</h2>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">MEMBER</div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">つくポイント</p>
                <p className="mt-3 text-5xl font-semibold text-slate-950">{profile ? `${profile.points}pt` : '---'}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">ログインとルーレットで毎日ポイントをためよう。</p>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">今日のミッション</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">ルーレットをまわそう</h3>
                  </div>
                  <div className="rounded-3xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">チャレンジ</div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">1〜100ptが当たるよ。毎日1回だけチャレンジできるよ。</p>
                <button
                  onClick={handleRoulette}
                  disabled={rouletteLoading || profile?.last_roulette_date === today}
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {profile?.last_roulette_date === today
                    ? '本日は完了済み'
                    : rouletteLoading ? '回しています...' : 'ルーレットを開始'}
                </button>
                {pointNotice && <p className="mt-3 text-sm text-slate-600">{pointNotice}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <BellRing className="text-violet-600" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">通知設定</p>
                    <p className="text-xs text-slate-500">すぐに情報を受け取れます</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">{notificationPermission === 'granted' ? '有効化済み' : 'まだ許可されていません'}</p>
                  <button
                    type="button"
                    onClick={requestNotifications}
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {notificationPermission === 'granted' ? '有効中' : '許可する'}
                  </button>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-amber-600" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">次の予定</p>
                    <p className="text-xs text-slate-500">候補日まであと何日？</p>
                  </div>
                </div>
                <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
                  {countdown ? (
                    <>
                      <p className="text-sm font-semibold text-slate-950">{countdown.title}</p>
                      <p className="mt-2 text-sm text-slate-500">{countdown.dateLabel}・{countdown.remaining}</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">現在予定候補はありません。</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[40px] border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.5)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-300">ホームカード</p>
                  <h3 className="mt-2 text-2xl font-semibold">今日のハイライト</h3>
                </div>
                <div className="rounded-3xl bg-white/10 px-3 py-2 text-sm font-semibold text-white">MEMO</div>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-slate-800/90 p-4">
                  <p className="text-sm text-slate-300">ログインメール</p>
                  <p className="mt-2 text-sm font-semibold text-white">{userEmail ?? '未ログイン'}</p>
                </div>
                <div className="rounded-3xl bg-slate-800/90 p-4">
                  <p className="text-sm text-slate-300">お気に入り</p>
                  <p className="mt-2 text-sm font-semibold text-white">{favorites.length} 件</p>
                </div>
              </div>
            </div>

            <div className="rounded-[40px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">最新のお知らせ</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">重要トピック</h3>
                </div>
                <div className="rounded-full bg-violet-50 p-2 text-violet-600">
                  <Info size={18} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {announcements.slice(0, 4).map((announcement) => {
                  const cfg = kindConfig[announcement.kind] || kindConfig.info
                  const Icon = cfg.icon
                  return (
                    <div key={announcement.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 rounded-2xl p-2 ${cfg.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-950">{announcement.title}</p>
                          {announcement.body && <p className="mt-1 text-sm leading-6 text-slate-600">{announcement.body}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[40px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-violet-600">メモ</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">今日のメッセージ</h2>
              </div>
              <div className="rounded-3xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">保存済み</div>
            </div>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="今日の予定・気づき・リマインダーをここに書こう。"
              className="mt-5 min-h-[220px] w-full rounded-[32px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">{memoSaved ? '保存しました' : 'ローカルに保存されます'}</p>
              <button
                type="button"
                onClick={saveMemo}
                className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                保存する
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[40px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">最近見たページ</p>
              <div className="mt-4 space-y-2">
                {recentPages.length > 0 ? (
                  recentPages.map((page) => (
                    <Link key={page.href} href={page.href} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-violet-200">
                      <span>{page.label}</span>
                      <ArrowRight size={16} className="text-slate-400" />
                    </Link>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">閲覧履歴がありません。ページを開くとここに表示されます。</div>
                )}
              </div>
            </div>

            <div className="rounded-[40px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">お気に入り</p>
              <div className="mt-4 space-y-3">
                {favorites.length > 0 ? (
                  announcements
                    .filter((announcement) => favorites.includes(String(announcement.id)))
                    .slice(0, 3)
                    .map((announcement) => {
                      const cfg = kindConfig[announcement.kind] || kindConfig.info
                      const Icon = cfg.icon
                      return (
                        <div key={announcement.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-2xl p-2 ${cfg.color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{announcement.body?.slice(0, 40) || '内容を確認しましょう。'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(String(announcement.id))}
                              className="rounded-full bg-white p-2 text-rose-500"
                            >
                              <Heart size={16} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">ハートを押して気になるお知らせを保存しましょう。</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-[40px] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-500" />
            <p className="mt-4 text-sm text-slate-500">データを読み込んでいます…</p>
          </div>
        )}

        {!loading && announcements.length === 0 && (
          <div className="rounded-[40px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <Bell className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-xl font-semibold text-slate-950">お知らせはまだありません</p>
            <p className="mt-2 text-sm text-slate-500">新しい情報が届くまで、他のページをチェックしましょう。</p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/schedule" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700">予定を見る</Link>
              <Link href="/info" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">情報を見る</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
