'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Announcement } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowRight, Bell, CalendarDays, Info, Loader2, Sparkles } from 'lucide-react'
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

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAnnouncements()

    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setAnnouncements((data as Announcement[]) || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_50%)]">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">つくたべホーム</p>
            <h1 className="text-xl font-bold text-gray-900">つくほーむ</h1>
          </div>
          <div className="rounded-full bg-violet-50 p-2 text-violet-600">
            <Sparkles size={18} />
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">今日の情報と予定をひと目で確認できます。</p>
      </header>

      <main className="space-y-4 px-4 py-4">
        <section className="rounded-[24px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 p-4 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">みんなのコミュニティ</p>
              <h2 className="mt-1 text-lg font-semibold leading-snug">気になる情報をすぐに確認しよう</h2>
            </div>
            <div className="rounded-full bg-white/20 p-2">
              <Sparkles size={18} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {QUICK_LINKS.map(({ href, label, description, icon: Icon, accent }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-2xl border border-white/20 p-3 ${accent}`}
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-full bg-white/20 p-2">
                    <Icon size={16} />
                  </div>
                  <ArrowRight size={16} />
                </div>
                <p className="mt-3 text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs leading-5 text-white/80">{description}</p>
              </Link>
            ))}
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
