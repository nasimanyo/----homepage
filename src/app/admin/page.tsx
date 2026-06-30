'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { CalendarDays, Bell, Plus, X, ChevronLeft, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Poll } from '@/types'
import { AppHeader } from '@/components/ui/AppHeader'
import { PageShell } from '@/components/ui/PageShell'

type Tab = 'polls' | 'announce'

export default function AdminPage() {
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()
  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState<Tab>('polls')
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  const [pollTitle, setPollTitle] = useState('')
  const [pollDesc, setPollDesc] = useState('')
  const [candidateDates, setCandidateDates] = useState<string[]>([''])
  const [creatingPoll, setCreatingPoll] = useState(false)

  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [creatingAnn, setCreatingAnn] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!data?.is_admin) { router.push('/home'); return }
    setAuthorized(true)
    fetchPolls()
  }

  async function fetchPolls() {
    if (!supabase) return
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false })
    setPolls((data as Poll[]) || [])
    setLoading(false)
  }

  async function createPoll() {
    if (!pollTitle.trim() || !supabase) return
    const validDates = candidateDates.filter(d => d.trim())
    if (validDates.length === 0) return
    setCreatingPoll(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: poll } = await supabase.from('polls').insert({
      created_by: user!.id,
      title: pollTitle,
      description: pollDesc || null,
      status: 'open',
    }).select().single()

    if (poll) {
      await supabase.from('poll_options').insert(
        validDates.map((d, i) => ({ poll_id: poll.id, candidate_date: d, sort_order: i }))
      )
      await supabase.from('announcements').insert({
        author_id: user!.id,
        title: `📅 予定合わせ開始「${pollTitle}」`,
        body: '候補日に投票してください！',
        kind: 'poll_started',
        ref_id: poll.id,
      })
    }

    setPollTitle(''); setPollDesc(''); setCandidateDates([''])
    await fetchPolls()
    setCreatingPoll(false)
  }

  async function closePoll(pollId: string, decidedDate: string) {
    if (!supabase) return
    await supabase.from('polls').update({ status: 'closed', decided_at: decidedDate }).eq('id', pollId)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('announcements').insert({
      author_id: user!.id,
      title: `✅ 日程確定！${format(new Date(decidedDate), 'M月d日(E)', { locale: ja })}に決まりました🎉`,
      kind: 'event',
    })
    await fetchPolls()
  }

  async function deletePoll(pollId: string) {
    if (!confirm('この予定合わせを削除しますか？') || !supabase) return
    await supabase.from('polls').delete().eq('id', pollId)
    await fetchPolls()
  }

  async function createAnnouncement() {
    if (!annTitle.trim() || !supabase) return
    setCreatingAnn(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('announcements').insert({
      author_id: user!.id,
      title: annTitle,
      body: annBody || null,
      kind: 'info',
    })
    setAnnTitle(''); setAnnBody('')
    setCreatingAnn(false)
    alert('お知らせを投稿しました！')
  }

  if (!authorized) return (
    <PageShell>
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={32} />
      </div>
    </PageShell>
  )

  return (
    <PageShell noPadding>
      <header className="sticky top-0 z-10 bg-[var(--tsuku-orange-dark)] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => router.push('/mypage')} className="rounded-lg p-1.5 hover:bg-white/10">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold">管理者パネル</h1>
            <p className="text-xs text-orange-100">なしまん専用</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-md border-b border-[var(--tsuku-border)] bg-white">
        {([['polls', '予定合わせ'], ['announce', 'お知らせ']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? 'border-b-2 border-[var(--tsuku-orange)] text-[var(--tsuku-orange-dark)]'
                : 'text-[var(--tsuku-text-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="mx-auto max-w-md space-y-4 px-4 py-4">
        {tab === 'polls' && (
          <>
            <div className="tsuku-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--tsuku-text)]">
                <Plus size={15} className="text-[var(--tsuku-orange)]" /> 新しい予定合わせを作成
              </h3>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="タイトル（例: 夏のバーベキュー）"
                  value={pollTitle}
                  onChange={e => setPollTitle(e.target.value)}
                  className="tsuku-input"
                />
                <textarea
                  placeholder="説明（任意）"
                  value={pollDesc}
                  onChange={e => setPollDesc(e.target.value)}
                  className="tsuku-input resize-none"
                  rows={2}
                />
                <div>
                  <p className="mb-2 text-xs font-semibold text-[var(--tsuku-text-muted)]">候補日</p>
                  <div className="space-y-2">
                    {candidateDates.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="date"
                          value={d}
                          onChange={e => {
                            const next = [...candidateDates]
                            next[i] = e.target.value
                            setCandidateDates(next)
                          }}
                          className="tsuku-input flex-1"
                        />
                        {candidateDates.length > 1 && (
                          <button
                            onClick={() => setCandidateDates(d => d.filter((_, j) => j !== i))}
                            className="p-1.5 text-stone-400 hover:text-red-400"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setCandidateDates(d => [...d, ''])}
                      className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--tsuku-orange-dark)]"
                    >
                      <Plus size={13} /> 候補日を追加
                    </button>
                  </div>
                </div>
                <button
                  onClick={createPoll}
                  disabled={creatingPoll || !pollTitle.trim()}
                  className="tsuku-btn w-full py-3 text-sm"
                >
                  {creatingPoll ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                  作成してお知らせを送る
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={24} />
              </div>
            ) : (
              <div className="space-y-2">
                {polls.map(poll => (
                  <div key={poll.id} className="tsuku-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[var(--tsuku-text)]">{poll.title}</p>
                        <span className={`text-xs font-semibold ${poll.status === 'open' ? 'text-[var(--tsuku-orange)]' : 'text-stone-400'}`}>
                          {poll.status === 'open' ? '● 募集中' : '✅ 確定済み'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {poll.status === 'open' && (
                          <button
                            onClick={async () => {
                              const date = prompt('確定日を入力 (YYYY-MM-DD)')
                              if (date) closePoll(poll.id, date)
                            }}
                            className="flex items-center gap-1 rounded-lg bg-[var(--tsuku-green-light)] px-2.5 py-1 text-xs font-semibold text-[var(--tsuku-green)]"
                          >
                            <CheckCircle2 size={12} /> 確定
                          </button>
                        )}
                        <button onClick={() => deletePoll(poll.id)} className="p-1.5 text-stone-300 hover:text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'announce' && (
          <div className="tsuku-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--tsuku-text)]">
              <Bell size={15} className="text-[var(--tsuku-orange)]" /> お知らせを投稿
            </h3>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="タイトル"
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                className="tsuku-input"
              />
              <textarea
                placeholder="内容（任意）"
                value={annBody}
                onChange={e => setAnnBody(e.target.value)}
                className="tsuku-input resize-none"
                rows={4}
              />
              <button
                onClick={createAnnouncement}
                disabled={creatingAnn || !annTitle.trim()}
                className="tsuku-btn w-full py-3 text-sm"
              >
                {creatingAnn ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                みんなに知らせる
              </button>
            </div>
          </div>
        )}
      </main>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
