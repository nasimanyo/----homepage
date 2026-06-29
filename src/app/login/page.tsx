'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User, Sparkles, ShieldCheck } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()

  async function handleSubmit() {
    setError('')
    setLoading(true)

    if (!supabase) {
      setError('通信環境の準備ができていません');
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      if (!displayName.trim()) { setError('表示名を入力してください'); setLoading(false); return }
      const { data, error: signupErr } = await supabase.auth.signUp({ email, password })
      if (signupErr) { setError(signupErr.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: displayName,
          points: 0,
          last_login_bonus_date: null,
          last_roulette_date: null,
        })
      }
      router.push('/home')
    } else {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) { setError('メールアドレスまたはパスワードが間違っています'); setLoading(false); return }
      router.push('/home')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">つくほーむ</p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950">ログイン</h1>
            <p className="mt-2 text-sm text-slate-500">メールアドレスとパスワードでログインしてください。</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {(['login', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    mode === m ? 'bg-slate-950 text-white shadow' : 'text-slate-500'
                  }`}
                >
                  {m === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>

            {mode === 'signup' && (
              <div className="space-y-3">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="表示名（例: なしまん）"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="パスワード（6文字以上）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="w-full rounded-3xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password || (mode === 'signup' && !displayName.trim())}
              className="mt-2 w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="mr-2 inline-block animate-spin" />}
              {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
            </button>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <ShieldCheck size={14} /> 安心安全
            </div>
            <p className="mt-2">登録情報は大切に管理します。すぐに予定やお知らせを確認できます。</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-slate-950 p-3 text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">つくほーむへようこそ</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">まいにちの予定管理をもっと楽しく</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            {['予定をすぐ見返せる', 'ルーレットでポイント獲得', 'お気に入りをすぐ保存'].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-slate-900" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
