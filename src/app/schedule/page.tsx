'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Poll } from '@/types'
import { CalendarDays, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function SchedulePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = typeof window === 'undefined' ? null : createClient()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase
      .from('polls')
      .select('*, poll_options(id)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPolls((data as Poll[]) || [])
        setLoading(false)
      })
  }, [supabase])

  const open = polls.filter(p => p.status === 'open')
  const closed = polls.filter(p => p.status === 'closed')

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">📅 予定合わせ</h1>
        <p className="text-xs text-gray-400 mt-0.5">みんなで日程を決めよう</p>
      </header>

      <main className="px-4 py-4 space-y-6">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-violet-400" size={28} />
          </div>
        )}

        {!loading && (
          <>
            {/* 募集中 */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock size={13} /> 募集中
              </h2>
              {open.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">募集中の予定合わせはありません</p>
              )}
              <div className="space-y-2">
                {open.map(p => (
                  <Link key={p.id} href={`/schedule/${p.id}`}>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-violet-100 hover:border-violet-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-50 text-violet-500">
                          <CalendarDays size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">{p.title}</p>
                          {p.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>
                          )}
                        </div>
                        <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                          投票する
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* 確定済み */}
            {closed.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> 確定済み
                </h2>
                <div className="space-y-2">
                  {closed.map(p => (
                    <Link key={p.id} href={`/schedule/${p.id}`}>
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 opacity-75">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-gray-50 text-gray-400">
                            <CheckCircle2 size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-700 text-sm">{p.title}</p>
                            {p.decided_at && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                確定日: {format(new Date(p.decided_at), 'M月d日(E)', { locale: ja })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
