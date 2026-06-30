'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Poll } from '@/types'
import { CalendarDays, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AppHeader } from '@/components/ui/AppHeader'
import { PageShell } from '@/components/ui/PageShell'

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
    <PageShell>
      <AppHeader subtitle="予定合わせ" />

      <main className="mt-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={28} />
          </div>
        )}

        {!loading && (
          <>
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--tsuku-text-muted)]">
                <Clock size={13} /> 募集中
              </h2>
              {open.length === 0 && (
                <p className="rounded-xl bg-stone-50 py-8 text-center text-sm text-[var(--tsuku-text-muted)]">
                  募集中の予定合わせはありません
                </p>
              )}
              <div className="space-y-2">
                {open.map(p => (
                  <Link key={p.id} href={`/schedule/${p.id}`}>
                    <div className="tsuku-card flex items-center gap-3 p-4 transition hover:border-[var(--tsuku-orange)]">
                      <div className="rounded-xl bg-[var(--tsuku-orange-light)] p-2 text-[var(--tsuku-orange)]">
                        <CalendarDays size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--tsuku-text)]">{p.title}</p>
                        {p.description && (
                          <p className="mt-0.5 text-xs text-[var(--tsuku-text-muted)] line-clamp-1">{p.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--tsuku-orange-light)] px-2.5 py-1 text-[10px] font-bold text-[var(--tsuku-orange-dark)]">
                        投票する
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {closed.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--tsuku-text-muted)]">
                  <CheckCircle2 size={13} /> 確定済み
                </h2>
                <div className="space-y-2">
                  {closed.map(p => (
                    <Link key={p.id} href={`/schedule/${p.id}`}>
                      <div className="tsuku-card flex items-center gap-3 p-4 opacity-75">
                        <div className="rounded-xl bg-stone-100 p-2 text-stone-400">
                          <CheckCircle2 size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--tsuku-text)]">{p.title}</p>
                          {p.decided_at && (
                            <p className="mt-0.5 text-xs text-[var(--tsuku-text-muted)]">
                              確定日: {format(new Date(p.decided_at), 'M月d日(E)', { locale: ja })}
                            </p>
                          )}
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
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
