'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Poll, PollOption, Vote, Profile } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowLeft, Check, X, Minus, Loader2, Trophy } from 'lucide-react'

type VoteAnswer = 'ok' | 'ng' | 'maybe'

const answerConfig = {
  ok: { label: '○', color: 'bg-green-100 text-green-700 border-green-300', icon: Check },
  maybe: { label: '△', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Minus },
  ng: { label: '✕', color: 'bg-red-100 text-red-700 border-red-300', icon: X },
}

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

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

    // my existing votes
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
    if (!userId) return
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

  function getVotesForOption(optionId: string) {
    return votes.filter(v => v.option_id === optionId)
  }

  function countAnswer(optionId: string, answer: VoteAnswer) {
    return votes.filter(v => v.option_id === optionId && v.answer === answer).length
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="animate-spin text-violet-400" size={32} />
    </div>
  )

  if (!poll) return <div className="p-8 text-center text-gray-400">見つかりませんでした</div>

  const isClosed = poll.status === 'closed'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-sm">{poll.title}</h1>
          {isClosed && poll.decided_at && (
            <p className="text-xs text-green-600 font-medium">
              ✅ {format(new Date(poll.decided_at), 'M月d日(E)', { locale: ja })} に確定！
            </p>
          )}
        </div>
        {isClosed && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">締切済み</span>}
      </header>

      <main className="px-4 py-4">
        {poll.description && (
          <p className="text-sm text-gray-500 mb-4 bg-gray-50 rounded-xl p-3">{poll.description}</p>
        )}

        {/* 集計テーブル */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-500 font-medium min-w-[90px]">日付</th>
                  {profiles.map(p => (
                    <th key={p.id} className="px-2 py-2 text-center text-gray-500 font-medium min-w-[44px]">
                      {p.display_name.slice(0, 3)}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-gray-500 font-medium min-w-[44px]">○</th>
                </tr>
              </thead>
              <tbody>
                {options.map(opt => {
                  const okCount = countAnswer(opt.id, 'ok')
                  const isDecided = isClosed && poll.decided_at === opt.candidate_date
                  return (
                    <tr key={opt.id} className={`border-b border-gray-50 ${isDecided ? 'bg-green-50' : ''}`}>
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        {isDecided && <Trophy size={12} className="inline mr-1 text-green-500" />}
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
                              <div className="flex gap-0.5 justify-center">
                                {(['ok', 'maybe', 'ng'] as VoteAnswer[]).map(ans => (
                                  <button
                                    key={ans}
                                    onClick={() => toggleVote(opt.id, ans)}
                                    className={`w-7 h-7 rounded-lg border text-xs font-bold transition-all ${
                                      myAnswer === ans
                                        ? answerConfig[ans].color + ' border-current'
                                        : 'bg-gray-50 text-gray-300 border-gray-200 hover:bg-gray-100'
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
                              <span className={`inline-block w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${answerConfig[displayAnswer as VoteAnswer]?.color}`}>
                                {answerConfig[displayAnswer as VoteAnswer]?.label}
                              </span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center">
                        <span className={`font-bold ${okCount >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
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
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            投票を保存する
          </button>
        )}
      </main>
    </div>
  )
}
export const dynamic = 'force-dynamic'
