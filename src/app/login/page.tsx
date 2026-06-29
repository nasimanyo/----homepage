'use client'

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
    <div className="min-h-screen bg-slate-950/90 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <aside className="hidden overflow-hidden rounded-[40px] bg-gradient-to-br from-violet-900 via-fuchsia-600 to-slate-950 p-10 text-white shadow-2xl lg:block">
          <div className="max-w-xl space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-300">つくたべホーム</p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight">予定もポイントも、毎日がもっと楽しくなる</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">ログインして、あなた専用のダッシュボードでスケジュールとお知らせを一括管理。</p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/15">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">スピードアクセス</p>
                <p className="mt-3 text-lg font-semibold text-white">予定確認・通知設定・ポイント管理</p>
              </div>
              <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/15">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">毎日ログイン</p>
                <p className="mt-3 text-lg font-semibold text-white">ログインするだけでボーナスpt獲得</p>
              </div>
            </div>
            <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">はじめての方へ</p>
              <p className="mt-3 text-lg font-semibold text-white">新規登録ですぐにスタートできます。</p>
            </div>
          </div>
        </aside>

        <section className="rounded-[40px] bg-white p-8 shadow-2xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">アカウント</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-950">ログイン / 新規登録</h1>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">つくほーむ</div>
            </div>

            <p className="text-sm text-slate-600">メールとパスワードを入力して、今日の予定やポイントをすぐに確認しましょう。</p>
          </div>

          <div className="mt-8 rounded-[32px] border border-slate-200 bg-slate-50 p-1">
            <div className="grid grid-cols-2 gap-1 rounded-[28px] bg-slate-50 p-1">
              {(['login', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={`rounded-[28px] px-4 py-3 text-sm font-semibold transition ${
                    mode === m ? 'bg-slate-950 text-white shadow' : 'text-slate-500'
                  }`}
                >
                  {m === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-5">
            {mode === 'signup' && (
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="表示名（例: なしまん）"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-[28px] border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[28px] border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full rounded-[28px] border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500"
              />
            </div>

            {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password || (mode === 'signup' && !displayName.trim())}
              className="mt-2 w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="mr-2 inline-block animate-spin" />}
              {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
            </button>
          </div>

          <div className="mt-8 rounded-[32px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">安心・安全</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">登録情報は大切に管理され、すぐに予定やお知らせを確認できます。</p>
          </div>

          <div className="mt-6 grid gap-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            {['すぐに予定を確認', '大事な情報を見逃さない', 'お気に入りをひと目で把握'].map((item) => (
              <div key={item} className="rounded-[28px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <Sparkles size={18} />
                </div>
                <p className="font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
