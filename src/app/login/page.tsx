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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_40%),linear-gradient(135deg,_#fdf4ff_0%,_#f8fafc_55%,_#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch">
        <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-20px_rgba(109,40,217,0.35)] backdrop-blur xl:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">つくほーむ</p>
              <h1 className="text-2xl font-bold text-gray-900">あつまり</h1>
            </div>
          </div>

          <div className="mb-5 rounded-2xl bg-violet-50 p-3 text-sm text-violet-700">
            <p className="font-semibold">みんなの予定を、もっと気軽に。</p>
            <p className="mt-1 text-sm text-violet-600/80">ログインして、今日の情報と予定をすぐ確認しましょう。</p>
          </div>

          <div className="mb-5 flex rounded-2xl bg-gray-100 p-1">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                {m === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="表示名（例: なしまん）"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-violet-400 focus:bg-white"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-violet-400 focus:bg-white"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>

          <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-xs leading-6 text-gray-600">
            <div className="flex items-center gap-2 font-semibold text-violet-700">
              <ShieldCheck size={14} /> 安心して使えるように
            </div>
            <p className="mt-1">登録内容は安全に管理され、必要なときにすぐ見返せます。</p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-[32px] border border-violet-100 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-500 p-6 text-white shadow-[0_20px_60px_-20px_rgba(99,102,241,0.45)] lg:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">おしゃれなコミュニティ体験</p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug">予定も、情報も、気分もひとまとめに。</h2>
          <p className="mt-3 text-sm leading-7 text-white/80">
            友だちとの予定やお知らせを、すっきり見やすい画面で管理できます。ログインすれば、すぐに次の一歩へ進めます。
          </p>
          <div className="mt-6 space-y-3">
            {['すぐに予定を確認', '大事な情報を見逃さない', 'お気に入りをひと目で把握'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Sparkles size={15} />
                </div>
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
