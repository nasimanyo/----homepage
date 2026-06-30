'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Poll } from '@/types'
import { CalendarDays, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AppHeader } from '@/components/ui/AppHeader'
import { Mascot } from '@/components/ui/Mascot'
import { PageShell } from '@/components/ui/PageShell'

function PollCard({
  poll,
  variant,
}: {
  poll: Poll
  variant: 'open' | 'closed'
}) {
  const isOpen = variant === 'open'

  return (
    <Link href={`/schedule/${poll.id}`}>
      <div
        className={`flex items-center gap-3 rounded-xl border border-[var(--tsuku-border)] p-3 transition sm:p-4 ${
          isOpen
            ? 'bg-stone-50 hover:border-[var(--tsuku-orange)] hover:bg-[var(--tsuku-orange-light)]/40'
            : 'bg-stone-50/80 opacity-80 hover:opacity-100'
        }`}
      >
        <div
          className={`shrink-0 rounded-xl p-2 ${
            isOpen ? 'bg-[var(--tsuku-orange-light)] text-[var(--tsuku-orange)]' : 'bg-stone-100 text-stone-400'
          }`}
        >
          {isOpen ? <CalendarDays size={18} /> : <CheckCircle2 size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--tsuku-text)] sm:text-base">{poll.title}</p>
          {isOpen && poll.description && (
            <p className="mt-0.5 text-xs text-[var(--tsuku-text-muted)] line-clamp-2 sm:text-sm">{poll.description}</p>
          )}
          {!isOpen && poll.decided_at && (
            <p className="mt-0.5 text-xs text-[var(--tsuku-text-muted)] sm:text-sm">
              確定日: {format(new Date(poll.decided_at), 'M月d日(E)', { locale: ja })}
            </p>
          )}
        </div>
        {isOpen && (
          <span className="shrink-0 rounded-full bg-[var(--tsuku-orange-light)] px-2.5 py-1 text-[10px] font-bold text-[var(--tsuku-orange-dark)] sm:text-xs">
            投票する
          </span>
        )}
      </div>
    </Link>
  )
}

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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={28} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <section className="tsuku-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--tsuku-text)]">
              <Clock size={18} className="text-[var(--tsuku-orange)]" />
              募集中
            </h2>
            {open.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-stone-50 p-8 text-center">
                <p className="text-sm font-semibold text-[var(--tsuku-text)]">募集中の予定合わせはありません</p>
                <p className="mt-1 text-xs text-[var(--tsuku-text-muted)]">新しい予定が始まるまでお待ちください</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {open.map(p => (
                  <li key={p.id}>
                    <PollCard poll={p} variant="open" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tsuku-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--tsuku-text)]">
              <CheckCircle2 size={18} className="text-[var(--tsuku-green)]" />
              確定済み
            </h2>
            {closed.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-stone-50 p-8 text-center">
                <p className="text-sm font-semibold text-[var(--tsuku-text)]">確定済みの予定はありません</p>
                <p className="mt-1 text-xs text-[var(--tsuku-text-muted)]">投票が終わるとここに表示されます</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {closed.map(p => (
                  <li key={p.id}>
                    <PollCard poll={p} variant="closed" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="mt-6 flex justify-center pb-2">
        <Mascot size="hero" speech="日程を決めよう！" />
      </div>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
