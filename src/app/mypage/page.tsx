'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'
import { User, LogOut, Settings, ShieldCheck, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      router.push('/login')
      return
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setEditName(data?.display_name || '')
      setLoading(false)
    })
  }, [router, supabase])

  async function saveName() {
    if (!profile || !editName.trim() || !supabase) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: editName }).eq('id', profile.id)
    setProfile(p => p ? { ...p, display_name: editName } : p)
    setSaving(false)
  }

  function getTodayDate() {
    return new Date().toISOString().split('T')[0]
  }

  async function handlePointAction(action: 'login_bonus' | 'roulette') {
    if (!profile || !supabase) return
    setActionLoading(true)
    setActionMessage(null)

    const response = await fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const result = await response.json()

    if (!response.ok) {
      setActionMessage(result?.error || 'エラーが発生しました')
      setActionLoading(false)
      return
    }

    setProfile(prev => prev ? {
      ...prev,
      points: result.points,
      last_login_bonus_date: action === 'login_bonus' ? getTodayDate() : prev.last_login_bonus_date,
      last_roulette_date: action === 'roulette' ? getTodayDate() : prev.last_roulette_date,
    } : prev)

    setActionMessage(action === 'login_bonus'
      ? 'ログインボーナスを受け取りました！ +1pt'
      : `ルーレットで ${result.spin}pt を獲得しました！`
    )
    setActionLoading(false)
  }

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="animate-spin text-violet-400" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.12),_transparent_45%)]">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">プロフィール</p>
            <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          </div>
          <div className="rounded-full bg-violet-50 p-2 text-violet-600">
            <User size={18} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <section className="overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 p-5 text-white shadow-[0_20px_60px_-24px_rgba(109,40,217,0.45)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white">
              <User size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">こんにちは</p>
              <h2 className="text-xl font-semibold">{profile?.display_name || 'ユーザー'}</h2>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
              <Sparkles size={14} /> つくポイント {profile?.points ?? 0}
            </span>
            {profile?.is_admin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
                <ShieldCheck size={14} /> 管理者
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
                <ShieldCheck size={14} /> 一般ユーザー
              </span>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-50 p-2 text-violet-600">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">ログインボーナス</h3>
                <p className="text-xs text-gray-500">毎日1ptを受け取れます</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-gray-900">+1pt</p>
                <p className="text-xs text-gray-500">最終受取日: {profile?.last_login_bonus_date || 'まだ'}</p>
              </div>
              <button
                onClick={() => handlePointAction('login_bonus')}
                disabled={actionLoading || profile?.last_login_bonus_date === getTodayDate()}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profile?.last_login_bonus_date === getTodayDate() ? '受け取り済み' : '受け取る'}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-50 p-2 text-violet-600">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">毎日ルーレット</h3>
                <p className="text-xs text-gray-500">1〜100ptのランダム報酬</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-gray-900">1〜100pt</p>
                <p className="text-xs text-gray-500">最終プレイ日: {profile?.last_roulette_date || 'まだ'}</p>
              </div>
              <button
                onClick={() => handlePointAction('roulette')}
                disabled={actionLoading || profile?.last_roulette_date === getTodayDate()}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profile?.last_roulette_date === getTodayDate() ? '今日のプレイ済み' : '回す'}
              </button>
            </div>
          </div>
        </section>

        {actionMessage && (
          <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-4 text-sm text-violet-700 shadow-sm">
            {actionMessage}
          </div>
        )}

        <section className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-violet-50 p-2 text-violet-600">
              <Settings size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">表示名を変更</h3>
              <p className="text-xs text-gray-500">わかりやすい名前にして、みんなに伝えましょう</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 outline-none transition focus:border-violet-400 focus:bg-white"
              placeholder="新しい表示名"
            />
            <button
              onClick={saveName}
              disabled={saving || editName === profile?.display_name}
              className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </section>

        {profile?.is_admin && (
          <Link href="/admin">
            <section className="rounded-[24px] border border-violet-100 bg-violet-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-violet-600 p-2 text-white">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">管理者パネルを開く</p>
                  <p className="text-xs text-gray-500">予定合わせの作成やお知らせ投稿ができます</p>
                </div>
              </div>
            </section>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-red-100 bg-red-50 py-3.5 text-sm font-semibold text-red-500 shadow-sm transition hover:bg-red-100"
        >
          <LogOut size={16} /> ログアウト
        </button>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
