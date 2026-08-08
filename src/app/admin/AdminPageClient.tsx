'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, Bell, Plus, X, ChevronLeft, Loader2, CheckCircle2, Trash2, QrCode, Sparkles, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import QRCode from 'qrcode'
import { Poll, Profile } from '@/types'
import { PageShell } from '@/components/ui/PageShell'

type Tab = 'polls' | 'announce' | 'members'

export default function AdminPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = typeof window === 'undefined' ? null : createClient()
  const [authorized, setAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'announce') return 'announce'
    if (tabParam === 'members') return 'members'
    return 'polls'
  })
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Profile[]>([])
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [grantingMemberId, setGrantingMemberId] = useState<string | null>(null)
  const [pollTitle, setPollTitle] = useState('')
  const [pollDesc, setPollDesc] = useState('')
  const [candidateDates, setCandidateDates] = useState<string[]>([''])
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [annTitle, setAnnTitle] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [creatingAnn, setCreatingAnn] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    const storedPassword = sessionStorage.getItem('tsuku-admin-password')
    if (profileData?.is_admin || storedPassword === 'nasimanyo') {
      setAuthorized(true)
      setCheckingAuth(false)
      await fetchPolls()
      await fetchMembers()
      return
    }

    setAuthorized(false)
    setCheckingAuth(false)
  }

  async function fetchPolls() {
    if (!supabase) return
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false })
    setPolls((data as Poll[]) || [])
    setLoading(false)
  }

  async function fetchMembers() {
    if (!supabase) return
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, points, is_admin, created_at')
      .order('created_at', { ascending: false })

    const nextMembers = (data as Profile[]) || []
    setMembers(nextMembers)

    if (typeof window !== 'undefined') {
      for (const member of nextMembers) {
        const targetUrl = `${window.location.origin}/scan?memberId=${member.id}`
        const dataUrl = await QRCode.toDataURL(targetUrl, { width: 220, margin: 1 })
        setQrCodes(prev => ({ ...prev, [member.id]: dataUrl }))
      }
    }
  }

  async function tryAdminPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (adminPassword === 'nasimanyo') {
      sessionStorage.setItem('tsuku-admin-password', 'nasimanyo')
      setPasswordError('')
      setAuthorized(true)
      setCheckingAuth(false)
      await fetchPolls()
      await fetchMembers()
      return
    }

    setPasswordError('パスワードが違います')
  }

  async function grantMemberPoints(memberId: string) {
    if (!supabase) return
    setGrantingMemberId(memberId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('ログインしてください')
      setGrantingMemberId(null)
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    const passwordAllowed = profileData?.is_admin || sessionStorage.getItem('tsuku-admin-password') === 'nasimanyo'
    if (!passwordAllowed) {
      alert('管理者パスワードが必要です')
      setGrantingMemberId(null)
      return
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', memberId)
      .maybeSingle()

    if (!targetProfile) {
      alert('対象会員が見つかりません')
      setGrantingMemberId(null)
      return
    }

    const nextPoints = (targetProfile.points ?? 0) + 1
    await supabase.from('profiles').update({ points: nextPoints }).eq('id', memberId)
    setMembers(prev => prev.map(member => member.id === memberId ? { ...member, points: nextPoints } : member))
    setGrantingMemberId(null)
    alert('1ポイントを付与しました')
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

  if (checkingAuth) return (
    <PageShell>
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={32} />
      </div>
    </PageShell>
  )

  if (!authorized) return (
    <PageShell>
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
        <form onSubmit={tryAdminPassword} className="w-full rounded-3xl border border-[var(--tsuku-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--tsuku-orange)]">
            <ShieldCheck size={18} />
            <h2 className="text-base font-bold text-[var(--tsuku-text)]">管理者パスワード</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--tsuku-text-muted)]">管理画面を開くにはパスワードが必要です。パスワードは <span className="font-semibold text-[var(--tsuku-orange-dark)]">nasimanyo</span> です。</p>
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            className="tsuku-input mt-4"
            placeholder="パスワード"
          />
          {passwordError && <p className="mt-2 text-sm text-red-500">{passwordError}</p>}
          <button type="submit" className="tsuku-btn mt-4 w-full py-3 text-sm">
            認証する
          </button>
        </form>
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
            <p className="text-xs text-orange-100">QRで会員にポイント付与</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-md border-b border-[var(--tsuku-border)] bg-white">
        {([['polls', '予定合わせ'], ['announce', 'お知らせ'], ['members', '会員QR']] as [Tab, string][]).map(([key, label]) => (
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
        {tab === 'members' && (
          <div className="space-y-3">
            <div className="tsuku-card p-4">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-[var(--tsuku-orange)]" />
                <h3 className="text-sm font-bold text-[var(--tsuku-text)]">会員ごとのQRコード</h3>
              </div>
              <p className="mt-2 text-sm text-[var(--tsuku-text-muted)]">QRを読み込むと、その会員に1ポイントを付与できます。</p>
            </div>
            {members.map(member => (
              <div key={member.id} className="tsuku-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--tsuku-text)]">{member.display_name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--tsuku-text-muted)]">
                      <Sparkles size={12} className="text-[var(--tsuku-orange)]" />
                      <span>{member.points ?? 0} pt</span>
                    </div>
                  </div>
                  <button
                    onClick={() => grantMemberPoints(member.id)}
                    disabled={grantingMemberId === member.id}
                    className="rounded-xl bg-[var(--tsuku-orange-light)] px-3 py-2 text-xs font-semibold text-[var(--tsuku-orange-dark)]"
                  >
                    {grantingMemberId === member.id ? <Loader2 size={14} className="animate-spin" /> : 'ポイント付与'}
                  </button>
                </div>
                <div className="mt-4 flex justify-center rounded-2xl bg-stone-50 p-4">
                  {qrCodes[member.id] ? (
                    <img src={qrCodes[member.id]} alt={`${member.display_name}のQRコード`} className="h-44 w-44 rounded-xl" />
                  ) : (
                    <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-white">
                      <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={24} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
