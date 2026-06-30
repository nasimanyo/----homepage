'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { callPointsApi } from '@/lib/points-api'
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
  Star,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { AppHeader } from '@/components/ui/AppHeader'
import { Mascot } from '@/components/ui/Mascot'
import { PageShell } from '@/components/ui/PageShell'
import { RouletteWheel, triggerWheelSpin } from '@/components/ui/RouletteWheel'

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
  const [bonusLoading, setBonusLoading] = useState(false)
  const [showRoulette, setShowRoulette] = useState(false)
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)
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
    if (savedMemo) setMemo(savedMemo)

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

      if (profileData) setProfile(profileData)
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

  async function handleLoginBonus() {
    if (!supabase || bonusLoading) return
    setPointNotice(null)
    setBonusLoading(true)

    const data = await callPointsApi(supabase, 'login_bonus')

    if ('error' in data) {
      setPointNotice(data.error)
    } else {
      setPointNotice('ログインボーナスを受け取りました！ +1pt')
      setProfile((prev) =>
        prev
          ? { ...prev, points: data.points, last_login_bonus_date: new Date().toISOString().split('T')[0] }
          : prev,
      )
    }
    setBonusLoading(false)
  }

  function openRouletteModal() {
    setPointNotice(null)
    setWheelSpinning(false)
    setShowRoulette(true)
  }

  async function handleRoulette() {
    if (!supabase || rouletteLoading) return
    setPointNotice(null)
    setRouletteLoading(true)

    const spinPromise = triggerWheelSpin(wheelRotation, setWheelSpinning, setWheelRotation)
    const apiPromise = callPointsApi(supabase, 'roulette')
    const [, data] = await Promise.all([spinPromise, apiPromise])

    if ('error' in data) {
      setPointNotice(data.error)
      setRouletteLoading(false)
      return
    }

    setPointNotice(`ルーレットで ${data.spin ?? 0}pt を獲得しました！`)
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
  const rouletteDone = profile?.last_roulette_date === today
  const bonusDone = profile?.last_login_bonus_date === today

  return (
    <PageShell>
      <AppHeader />

      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
      {/* ウェルカム & ポイント */}
      <section className="tsuku-card p-5 sm:p-6">
        <p className="text-center text-base font-bold text-[var(--tsuku-text)]">
          ようこそ{profile?.display_name ? ` ${profile.display_name} さん` : ' ゲストさん'}！
        </p>

        <div className="mt-5 rounded-2xl bg-[var(--tsuku-orange-light)] p-4 text-center">
          <p className="text-xs font-bold tracking-wider text-[var(--tsuku-orange-dark)]">つくポイント</p>
          <p className="mt-1 text-4xl font-extrabold text-[var(--tsuku-text)]">
            {profile ? `${profile.points ?? 0}` : '---'}
            <span className="ml-1 text-lg font-bold">pt</span>
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleLoginBonus}
            disabled={bonusLoading || bonusDone}
            className="tsuku-btn w-full px-4 py-3 text-sm"
          >
            {bonusLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                受け取り中...
              </>
            ) : bonusDone ? (
              'ボーナス受取済み'
            ) : (
              'ログインボーナス +1pt'
            )}
          </button>
          <button
            onClick={openRouletteModal}
            disabled={rouletteDone}
            className="tsuku-btn w-full px-4 py-3 text-sm"
          >
            <Star size={14} className="fill-current" />
            {rouletteDone ? 'ルーレット完了済み' : 'ルーレットを回す'}
          </button>
        </div>

        {pointNotice && !showRoulette && (
          <p className="mt-3 rounded-xl bg-[var(--tsuku-green-light)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--tsuku-green)]">
            {pointNotice}
          </p>
        )}
      </section>

      {/* お知らせ */}
      <section className="tsuku-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--tsuku-text)]">
          <BellRing size={18} className="text-[var(--tsuku-orange)]" />
          お知らせ
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={28} />
          </div>
        ) : announcements.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-stone-50 p-6 text-center">
            <Bell className="mx-auto text-stone-300" size={32} />
            <p className="mt-3 text-sm font-semibold text-[var(--tsuku-text)]">お知らせはまだありません</p>
            <p className="mt-1 text-xs text-[var(--tsuku-text-muted)]">新しい情報が届くまでお待ちください</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/schedule" className="tsuku-btn px-4 py-2 text-xs">予定を見る</Link>
              <Link href="/info" className="rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold text-[var(--tsuku-text)]">情報を見る</Link>
            </div>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {announcements.map((announcement) => {
              const cfg = kindConfig[announcement.kind] || kindConfig.info
              const Icon = cfg.icon
              const authorName = announcement.profiles?.display_name
              const isFav = favorites.includes(String(announcement.id))

              return (
                <li
                  key={announcement.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--tsuku-border)] bg-stone-50 p-3"
                >
                  <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${cfg.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-[var(--tsuku-text)]">
                      {authorName ? `${authorName}さんが投稿を公開しました` : announcement.title}
                    </p>
                    {announcement.body && (
                      <p className="mt-0.5 text-xs text-[var(--tsuku-text-muted)] line-clamp-2">{announcement.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-stone-400">
                      {formatDistanceToNow(new Date(announcement.created_at), { locale: ja, addSuffix: true })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(String(announcement.id))}
                    className={`shrink-0 rounded-full p-1.5 transition ${isFav ? 'text-[var(--tsuku-orange)]' : 'text-stone-300 hover:text-[var(--tsuku-orange)]'}`}
                    aria-label={isFav ? 'お気に入り解除' : 'お気に入り追加'}
                  >
                    <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:gap-6">
      {/* お気に入り */}
      <section className="tsuku-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--tsuku-text)]">
          <Star size={18} className="fill-[var(--tsuku-orange)] text-[var(--tsuku-orange)]" />
          お気に入り
          <span className="ml-auto text-xs font-normal text-[var(--tsuku-text-muted)]">{favorites.length} 件</span>
        </h2>

        <ul className="mt-4 space-y-2">
          {favorites.length > 0 ? (
            announcements
              .filter((a) => favorites.includes(String(a.id)))
              .map((announcement) => {
                const cfg = kindConfig[announcement.kind] || kindConfig.info
                const Icon = cfg.icon
                return (
                  <li
                    key={announcement.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--tsuku-border)] bg-stone-50 p-3"
                  >
                    <Star size={14} className="shrink-0 fill-[var(--tsuku-orange)] text-[var(--tsuku-orange)]" />
                    <div className={`shrink-0 rounded-lg p-1.5 ${cfg.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--tsuku-text)] truncate">{announcement.title}</p>
                      <p className="text-xs text-[var(--tsuku-text-muted)] truncate">
                        {announcement.body ?? '内容を確認しましょう。'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(String(announcement.id))}
                      className="shrink-0 text-[var(--tsuku-orange)]"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </li>
                )
              })
          ) : (
            <li className="rounded-xl bg-stone-50 p-4 text-center text-sm text-[var(--tsuku-text-muted)]">
              ハートを押して気になるお知らせを保存しましょう。
            </li>
          )}
        </ul>
      </section>

      {/* 次の予定 & 通知 */}
      {(countdown || notificationPermission !== 'granted') && (
        <section className="tsuku-card grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          {countdown && (
            <div className="rounded-xl bg-[var(--tsuku-green-light)] p-4">
              <p className="text-xs font-bold text-[var(--tsuku-green)]">次の予定</p>
              <p className="mt-1 text-sm font-semibold text-[var(--tsuku-text)]">{countdown.title}</p>
              <p className="text-xs text-[var(--tsuku-text-muted)]">{countdown.dateLabel}・{countdown.remaining}</p>
            </div>
          )}
          {notificationPermission !== 'granted' && (
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-bold text-[var(--tsuku-text-muted)]">通知設定</p>
              <p className="mt-1 text-xs text-[var(--tsuku-text-muted)]">新しいお知らせをすぐ受け取れます</p>
              <button
                type="button"
                onClick={requestNotifications}
                className="tsuku-btn mt-2 px-3 py-1.5 text-xs"
              >
                許可する
              </button>
            </div>
          )}
        </section>
      )}

      {/* メモ */}
      <section className="tsuku-card p-5 sm:p-6">
        <h2 className="text-base font-bold text-[var(--tsuku-text)]">今日のメッセージ</h2>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="今日の予定・気づき・リマインダーをここに書こう。"
          className="tsuku-input mt-3 min-h-[100px] resize-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[var(--tsuku-text-muted)]">
            {memoSaved ? '保存しました' : 'ローカルに保存されます'}
          </p>
          <button type="button" onClick={saveMemo} className="tsuku-btn px-4 py-2 text-xs">
            保存する
          </button>
        </div>
      </section>

      {/* 最近見たページ */}
      {recentPages.length > 0 && (
        <section className="tsuku-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-sm font-bold text-[var(--tsuku-text-muted)]">最近見たページ</h2>
          <ul className="mt-3 space-y-1.5">
            {recentPages.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-2.5 text-sm text-[var(--tsuku-text)] transition hover:bg-[var(--tsuku-orange-light)]"
                >
                  <span>{page.label}</span>
                  <ArrowRight size={14} className="text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>

      {/* マスコット */}
      <div className="mt-8 flex justify-center pb-2 md:mt-10">
        <Mascot size="xl" />
      </div>

      {/* ルーレットモーダル */}
      {showRoulette && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="tsuku-card w-full max-w-sm p-6 animate-in">
            <div className="flex items-center justify-between">
              <AppHeader />
              <button
                type="button"
              onClick={() => {
                setShowRoulette(false)
                setPointNotice(null)
                setWheelSpinning(false)
              }}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6">
              <RouletteWheel spinning={wheelSpinning} rotation={wheelRotation} />
            </div>

            {pointNotice && (
              <p className="mt-4 rounded-xl bg-[var(--tsuku-green-light)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--tsuku-green)]">
                {pointNotice}
              </p>
            )}

            <button
              onClick={handleRoulette}
              disabled={rouletteLoading || rouletteDone}
              className="tsuku-btn mt-6 w-full px-5 py-4 text-base"
            >
              {rouletteLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  回しています...
                </>
              ) : rouletteDone ? (
                '本日は完了済み'
              ) : (
                'スタート!!'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowRoulette(false)
                setPointNotice(null)
                setWheelSpinning(false)
              }}
              className="mt-4 w-full text-center text-sm font-medium text-[var(--tsuku-text-muted)] underline-offset-2 hover:underline"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
