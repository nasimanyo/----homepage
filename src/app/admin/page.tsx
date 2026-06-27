'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { CalendarDays, Bell, Plus, X, ChevronLeft, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Poll } from '@/types'

type Tab = 'polls' | 'announce'

export default function AdminPage() {
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()
  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState<Tab>('polls')
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  // Poll form
  const [pollTitle, setPollTitle] = useState('')
  const [pollDesc, setPollDesc] = useState('')
  const [candidateDates, setCandidateDates] = useState<string[]>([''])
  const [creatingPoll, setCreatingPoll] = useState(false)

  // Announce form
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
      // お知らせ自動投稿
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
    <div className="flex justify-center py-24">
      <Loader2 className="animate-spin text-violet-400" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-violet-700 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/mypage')} className="p-1.5 rounded-lg hover:bg-violet-600">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-base">🛡 管理者パネル</h1>
          <p className="text-xs text-violet-200">なしまん専用</p>
        </div>
      </header>

      {/* Tab */}
      <div className="flex border-b border-gray-200 bg-white">
        {([['polls', '📅 予定合わせ'], ['announce', '🔔 お知らせ']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === key ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-4 py-4 space-y-4">

        {/* ======= 予定合わせタブ ======= */}
        {tab === 'polls' && (
          <>
            {/* 新規作成フォーム */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <Plus size={15} className="text-violet-500" /> 新しい予定合わせを作成
              </h3>
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="タイトル（例: 夏のバーベキュー）"
                  value={pollTitle}
                  onChange={e => setPollTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                />
                <textarea
                  placeholder="説明（任意）"
                  value={pollDesc}
                  onChange={e => setPollDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none"
                  rows={2}
                />
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">候補日</p>
                  <div className="space-y-1.5">
                    {candidateDates.map((d, i) => (
                      <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="date"
                          value={d}
                          onChange={e => {
                            const next = [...candidateDates]
                            next[i] = e.target.value
                            setCandidateDates(next)
                          }}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                        />
                        {candidateDates.length > 1 && (
                          <button
                            onClick={() => setCandidateDates(d => d.filter((_, j) => j !== i))}
                            className="p-1.5 text-gray-400 hover:text-red-400"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setCandidateDates(d => [...d, ''])}
                      className="text-xs text-violet-600 font-medium flex items-center gap-1 mt-1"
                    >
                      <Plus size={13} /> 候補日を追加
                    </button>
                  </div>
                </div>
                <button
                  onClick={createPoll}
                  disabled={creatingPoll || !pollTitle.trim()}
                  className="w-full py-3 bg-violet-600 text-white rounded-2xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {creatingPoll ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                  作成してお知らせを送る
                </button>
              </div>
            </div>

            {/* 既存の投票一覧 */}
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-300" size={24} /></div>
            ) : (
              <div className="space-y-2">
                {polls.map(poll => (
                  <div key={poll.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{poll.title}</p>
                        <span className={`text-xs font-medium ${poll.status === 'open' ? 'text-violet-600' : 'text-gray-400'}`}>
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
                            className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} /> 確定
                          </button>
                        )}
                        <button onClick={() => deletePoll(poll.id)} className="p-1.5 text-gray-300 hover:text-red-400">
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

        {/* ======= お知らせタブ ======= */}
        {tab === 'announce' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <Bell size={15} className="text-violet-500" /> お知らせを投稿
            </h3>
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="タイトル"
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
              <textarea
                placeholder="内容（任意）"
                value={annBody}
                onChange={e => setAnnBody(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none"
                rows={4}
              />
              <button
                onClick={createAnnouncement}
                disabled={creatingAnn || !annTitle.trim()}
                className="w-full py-3 bg-violet-600 text-white rounded-2xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creatingAnn ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                みんなに知らせる
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
