'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Announcement, Poll, Profile } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowRight, Bell, BellRing, CalendarDays, Heart, Info, Loader2, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const kindConfig = {
  info: { icon: Info, color: 'text-blue-600 bg-blue-50', label: 'お知らせ' },
  poll_started: { icon: CalendarDays, color: 'text-violet-600 bg-violet-50', label: '予定合わせ開始' },
  event: { icon: Bell, color: 'text-emerald-600 bg-emerald-50', label: 'イベント' },
}

const QUICK_LINKS = [
  {
    href: '/schedule',
    label: '予定を見る',
    description: 'みんなの予定と投票状況を確認',
    icon: CalendarDays,
    accent: 'bg-white/15 text-white',
  },
  {
    href: '/info',
    label: '情報を見る',
    description: '大事な案内や更新をチェック',
    icon: Info,
    accent: 'bg-white/15 text-white',
  },
]

const RECOMMENDED_ACTIONS = [
  {
    href: '/schedule',
    title: '予定を確認する',
    description: '今週の参加状況をすぐチェック',
    icon: CalendarDays,
    color: 'bg-violet-50 text-violet-600',
  },
  {
    href: '/info',
    title: '情報を見返す',
    description: '大切な案内や連絡を確認',
    icon: Info,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/home',
    title: 'メモを残す',
    description: '気づいたことをすぐ保存',
    icon: Sparkles,
    color: 'bg-amber-50 text-amber-600',
  },
]

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
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
      setProfileLoading(false)
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

    return () => { supabase.removeChannel(channel) }
  }, [])

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
    const candidates = polls.flatMap((poll) => (poll.poll_options || []).map((option) => ({
      title: poll.title,
      candidateDate: option.candidate_date,
    })))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = candidates
      .filter((candidate) => new Date(`${candidate.candidateDate}T00:00:00`) >= today)
      .sort((a, b) => new Date(`${a.candidateDate}T00:00:00`).getTime() - new Date(`${b.candidateDate}T00:00:00`).getTime())

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
    setProfile((prev) => prev ? { ...prev, points: data.points, last_roulette_date: new Date().toISOString().split('T')[0] } : prev)
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_50%)]">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-3 py-4 backdrop-blur sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">つくたべホーム</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">つくほーむ</h1>
          </div>
          <div className="rounded-full bg-violet-50 p-2 text-violet-600">
            <Image src="/favicon.ico" alt="つくほーむのアイコン" width={20} height={20} />
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-500 sm:text-base">今日の情報と予定をひと目で確認できます。</p>
      </header>

      <main className="space-y-4 px-3 py-4 sm:px-6 sm:py-6">
        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">つくほーむ</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">ようこそ{profile?.display_name ? `、${profile.display_name}さん` : '！'}</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">MEMBER</div>
            </div>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">つくポイント</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-950">{profile ? `${profile.points}pt` : '---'}</p>
                </div>
                <div className="rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm">ランクB</div>
              </div>
              <p className="mt-4 text-sm text-slate-500">毎日ログインとルーレットでポイントをためよう。</p>
            </div>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">ルーレット</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">1〜100ptをランダムゲット</p>
                </div>
                <button
                  onClick={handleRoulette}
                  disabled={rouletteLoading || profile?.last_roulette_date === new Date().toISOString().split('T')[0]}
                  className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {profile?.last_roulette_date === new Date().toISOString().split('T')[0]
                    ? '今日のプレイ済み'
                    : rouletteLoading ? '回しています...' : 'スタート'}
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-500">つくポイントをためると、より便利に使えるようになります。</p>
            </div>

            {pointNotice && (
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {pointNotice}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">お知らせ</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">最新のトピック</h3>
              </div>
              <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {announcements.slice(0, 4).map((announcement) => {
                const cfg = kindConfig[announcement.kind] || kindConfig.info
                const Icon = cfg.icon
                return (
                  <div key={announcement.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl p-2 ${cfg.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">{announcement.title}</p>
                        {announcement.body && <p className="mt-1 text-sm text-slate-600">{announcement.body}</p>}
                        <p className="mt-2 text-xs text-slate-500">{announcement.profiles?.display_name || '運営'} · {formatDistanceToNow(new Date(announcement.created_at), { locale: ja, addSuffix: true })}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-violet-50 p-2">
                <Image src="/favicon.ico" alt="つくほーむのアイコン" width={18} height={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">今日のおすすめ</p>
                <p className="text-xs text-gray-500">迷ったらこの3つから始めよう</p>
              </div>
            </div>
            <div className="rounded-full bg-amber-50 p-2 text-amber-600">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {RECOMMENDED_ACTIONS.map(({ href, title, description, icon: Icon, color }) => (
              <Link key={title} href={href} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className={`rounded-full p-2 ${color}`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">最近見たページ</p>
              <p className="text-xs text-gray-500">すぐ戻れるように整理しておきます</p>
            </div>
            <div className="rounded-full bg-violet-50 p-2 text-violet-600">
              <CalendarDays size={16} />
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {recentPages.length > 0 ? (
              recentPages.map((page) => (
                <Link key={page.href} href={page.href} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm font-medium text-gray-700">{page.label}</span>
                  <ArrowRight size={15} className="text-gray-400" />
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-500">まだ履歴がありません。ページを開くとここに表示されます。</p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">通知と予定</p>
              <p className="text-xs text-gray-500">今すぐ気になる内容を見逃しません</p>
            </div>
            <div className="rounded-full bg-violet-50 p-2 text-violet-600">
              <BellRing size={16} />
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">プッシュ通知</p>
                <p className="text-xs text-gray-500">{userEmail ? `通知先: ${userEmail}` : 'ログイン中のメールを利用します'}</p>
              </div>
              <button
                type="button"
                onClick={requestNotifications}
                className="rounded-full bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
              >
                {notificationPermission === 'granted' ? '有効中' : '許可する'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {notificationPermission === 'granted'
                ? 'お知らせが来たらこの端末ですぐ通知します。'
                : 'ブラウザの通知を許可すると、重要な情報をすぐ届けられます。'}
            </p>
          </div>

          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">次の予定まで</p>
                <p className="text-xs text-gray-500">今後の候補日をひと目で確認</p>
              </div>
              <div className="rounded-full bg-white p-2 text-amber-600">
                <CalendarDays size={16} />
              </div>
            </div>
            {countdown ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-800">{countdown.title}</p>
                <p className="text-xs text-gray-500">{countdown.dateLabel}・{countdown.remaining}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">まだ予定候補がありません。</p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">お気に入り</p>
              <p className="text-xs text-gray-500">大事な情報だけをすぐ見られます</p>
            </div>
            <div className="rounded-full bg-rose-50 p-2 text-rose-500">
              <Heart size={16} />
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {favorites.length > 0 ? (
              announcements
                .filter((announcement) => favorites.includes(String(announcement.id)))
                .slice(0, 3)
                .map((announcement) => {
                  const cfg = kindConfig[announcement.kind] || kindConfig.info
                  const Icon = cfg.icon
                  return (
                    <div key={announcement.id} className="rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className={`rounded-2xl p-2 ${cfg.color}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{announcement.title}</p>
                            <p className="text-xs text-gray-500">{announcement.body?.slice(0, 36) || '内容を確認しましょう'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(String(announcement.id))}
                          className="rounded-full bg-white p-1.5 text-rose-500"
                        >
                          <Heart size={15} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  )
                })
            ) : (
              <p className="rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-500">気になるお知らせをハートで保存できます。</p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-violet-50 p-2">
              <Image src="/favicon.ico" alt="つくほーむのアイコン" width={18} height={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">ひとことメモ</p>
              <p className="text-xs text-gray-500">大事なことをすぐ残せます</p>
            </div>
          </div>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="今日の予定や気づきをメモしておこう"
            className="mt-3 min-h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none ring-0 placeholder:text-gray-400"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">{memoSaved ? '保存しました' : '端末に保存されます'}</p>
            <button
              type="button"
              onClick={saveMemo}
              className="rounded-full bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
            >
              保存
            </button>
          </div>
        </section>

        {loading && (
          <div className="flex justify-center rounded-3xl border border-gray-100 bg-white py-12 shadow-sm">
            <Loader2 className="animate-spin text-violet-400" size={28} />
          </div>
        )}

        {!loading && announcements.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-base font-semibold text-gray-700">まだお知らせはありません</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">新しい情報が届くまで、予定や案内を確認してみましょう。</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/schedule" className="rounded-full bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-600">
                予定を見る
              </Link>
              <Link href="/info" className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                情報を見る
              </Link>
            </div>
          </div>
        )}

        {!loading && announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map(a => {
              const cfg = kindConfig[a.kind] || kindConfig.info
              const Icon = cfg.icon
              return (
                <article key={a.id} className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl p-2 ${cfg.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold tracking-[0.18em] text-gray-400">{cfg.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(String(a.id))}
                          className={`rounded-full p-1.5 ${favorites.includes(String(a.id)) ? 'bg-rose-50 text-rose-500' : 'bg-gray-100 text-gray-400'}`}
                        >
                          <Heart size={14} fill={favorites.includes(String(a.id)) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{a.title}</p>
                      {a.body && <p className="mt-1 text-sm leading-6 text-gray-600">{a.body}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span>{a.profiles?.display_name || '管理者'}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(a.created_at), { locale: ja, addSuffix: true })}</span>
                      </div>
                      {a.kind === 'poll_started' && a.ref_id && (
                        <Link
                          href={`/schedule/${a.ref_id}`}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-600"
                        >
                          投票する
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
