'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Announcement } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Bell, CalendarDays, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'

const kindConfig = {
  info: { icon: Info, color: 'text-blue-500 bg-blue-50', label: 'お知らせ' },
  poll_started: { icon: CalendarDays, color: 'text-violet-500 bg-violet-50', label: '予定合わせ開始' },
  event: { icon: Bell, color: 'text-green-500 bg-green-50', label: 'イベント' },
}

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAnnouncements()

    // Realtime subscription
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">🏠 最新情報</h1>
        <p className="text-xs text-gray-400 mt-0.5">みんなの動きをチェック</p>
      </header>

      <main className="px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-violet-400" size={28} />
          </div>
        )}

        {!loading && announcements.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">まだお知らせはありません</p>
          </div>
        )}

        {announcements.map(a => {
          const cfg = kindConfig[a.kind] || kindConfig.info
          const Icon = cfg.icon
          return (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-400">{cfg.label}</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{a.title}</p>
                  {a.body && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.body}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-300">
                      {a.profiles?.display_name || '管理者'}
                    </span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-300">
                      {formatDistanceToNow(new Date(a.created_at), { locale: ja, addSuffix: true })}
                    </span>
                  </div>
                  {a.kind === 'poll_started' && a.ref_id && (
                    <Link
                      href={`/schedule/${a.ref_id}`}
                      className="inline-block mt-2 text-xs text-violet-600 font-medium underline underline-offset-2"
                    >
                      投票する →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
