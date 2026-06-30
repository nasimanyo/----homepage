'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Poll, PollOption, Vote, Profile } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowLeft, Check, X, Minus, Loader2, Trophy } from 'lucide-react'
import { AppHeader } from '@/components/ui/AppHeader'
import { PageShell } from '@/components/ui/PageShell'

type VoteAnswer = 'ok' | 'ng' | 'maybe'

const answerConfig = {
  ok: { label: '○', color: 'bg-green-100 text-green-700 border-green-300', icon: Check },
  maybe: { label: '△', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Minus },
  ng: { label: '✕', color: 'bg-red-100 text-red-700 border-red-300', icon: X },
}

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()

  const [poll, setPoll] = useState<Poll | null>(null)
  const [options, setOptions] = useState<PollOption[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [myVotes, setMyVotes] = useState<Record<string, VoteAnswer>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    init()
  }, [id])

  async function init() {
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const [pollRes, optRes, voteRes, profileRes] = await Promise.all([
      supabase.from('polls').select('*').eq('id', id).single(),
      supabase.from('poll_options').select('*').eq('poll_id', id).order('candidate_date'),
      supabase.from('votes').select('*, profiles(display_name)').in(
        'option_id',
        (await supabase.from('poll_options').select('id').eq('poll_id', id)).data?.map(o => o.id) || []
      ),
      supabase.from('profiles').select('*'),
    ])

    setPoll(pollRes.data)
    setOptions(optRes.data || [])
    const v = (voteRes.data as Vote[]) || []
    setVotes(v)
    setProfiles(profileRes.data || [])

    const mine: Record<string, VoteAnswer> = {}
    v.filter(vote => vote.voter_id === user.id).forEach(vote => {
      mine[vote.option_id] = vote.answer as VoteAnswer
    })
    setMyVotes(mine)
    setLoading(false)
  }

  function toggleVote(optionId: string, answer: VoteAnswer) {
    if (poll?.status === 'closed') return
    setMyVotes(prev => ({ ...prev, [optionId]: answer }))
  }

  async function submitVotes() {
    if (!userId || !supabase) return
    setSaving(true)
    for (const [optionId, answer] of Object.entries(myVotes)) {
      await supabase.from('votes').upsert(
        { option_id: optionId, voter_id: userId, answer },
        { onConflict: 'option_id,voter_id' }
      )
    }
    await init()
    setSaving(false)
  }

  function countAnswer(optionId: string, answer: VoteAnswer) {
    return votes.filter(v => v.option_id === optionId && v.answer === answer).length
  }

  if (loading) return (
    <PageShell>
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={32} />
      </div>
    </PageShell>
  )

  if (!poll) return (
    <PageShell>
      <p className="py-12 text-center text-[var(--tsuku-text-muted)]">見つかりませんでした</p>
    </PageShell>
  )

  const isClosed = poll.status === 'closed'

  return (
    <PageShell noPadding>
      <header className="sticky top-0 z-10 border-b border-[var(--tsuku-border)] bg-[var(--tsuku-bg)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-stone-100">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-bold text-[var(--tsuku-text)]">{poll.title}</h1>
            {isClosed && poll.decided_at && (
              <p className="text-xs font-semibold text-[var(--tsuku-green)]">
                {format(new Date(poll.decided_at), 'M月d日(E)', { locale: ja })} に確定！
              </p>
            )}
          </div>
          {isClosed && (
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
              締切済み
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        {poll.description && (
          <p className="mb-4 rounded-xl bg-stone-50 p-3 text-sm text-[var(--tsuku-text-muted)]">{poll.description}</p>
        )}

        <div className="tsuku-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--tsuku-border)] bg-stone-50">
                  <th className="min-w-[90px] px-3 py-2 text-left font-semibold text-[var(--tsuku-text-muted)]">日付</th>
                  {profiles.map(p => (
                    <th key={p.id} className="min-w-[44px] px-2 py-2 text-center font-semibold text-[var(--tsuku-text-muted)]">
                      {p.display_name.slice(0, 3)}
                    </th>
                  ))}
                  <th className="min-w-[44px] px-2 py-2 text-center font-semibold text-[var(--tsuku-text-muted)]">○</th>
                </tr>
              </thead>
              <tbody>
                {options.map(opt => {
                  const okCount = countAnswer(opt.id, 'ok')
                  const isDecided = isClosed && poll.decided_at === opt.candidate_date
                  return (
                    <tr key={opt.id} className={`border-b border-stone-50 ${isDecided ? 'bg-[var(--tsuku-green-light)]' : ''}`}>
                      <td className="px-3 py-2.5 font-semibold text-[var(--tsuku-text)]">
                        {isDecided && <Trophy size={12} className="mr-1 inline text-[var(--tsuku-green)]" />}
                        {format(new Date(opt.candidate_date), 'M/d(E)', { locale: ja })}
                      </td>
                      {profiles.map(p => {
                        const vote = votes.find(v => v.option_id === opt.id && v.voter_id === p.id)
                        const isMe = p.id === userId
                        const myAnswer = isMe ? myVotes[opt.id] : undefined
                        const displayAnswer = isMe ? myAnswer : vote?.answer

                        if (isMe && !isClosed) {
                          return (
                            <td key={p.id} className="px-1 py-1.5 text-center">
                              <div className="flex justify-center gap-0.5">
                                {(['ok', 'maybe', 'ng'] as VoteAnswer[]).map(ans => (
                                  <button
                                    key={ans}
                                    onClick={() => toggleVote(opt.id, ans)}
                                    className={`h-7 w-7 rounded-lg border text-xs font-bold transition-all ${
                                      myAnswer === ans
                                        ? answerConfig[ans].color + ' border-current'
                                        : 'border-stone-200 bg-stone-50 text-stone-300 hover:bg-stone-100'
                                    }`}
                                  >
                                    {answerConfig[ans].label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={p.id} className="px-2 py-2 text-center">
                            {displayAnswer ? (
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${answerConfig[displayAnswer as VoteAnswer]?.color}`}>
                                {answerConfig[displayAnswer as VoteAnswer]?.label}
                              </span>
                            ) : (
                              <span className="text-stone-200">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center">
                        <span className={`font-bold ${okCount >= 2 ? 'text-[var(--tsuku-green)]' : 'text-stone-400'}`}>
                          {okCount}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!isClosed && (
          <button
            onClick={submitVotes}
            disabled={saving}
            className="tsuku-btn mt-4 w-full py-3.5 text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            投票を保存する
          </button>
        )}
      </main>
    </PageShell>
  )
}
export const dynamic = 'force-dynamic'
