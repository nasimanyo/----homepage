'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Mail, Lock, User, ShieldCheck } from 'lucide-react'
import Character from '../images/tukkun.png'

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
      setError('通信環境の準備ができていません')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('表示名を入力してください')
        setLoading(false)
        return
      }

      const { data, error: signupErr } = await supabase.auth.signUp({ email, password })
      if (signupErr) {
        setError(signupErr.message)
        setLoading(false)
        return
      }

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
      if (loginErr) {
        setError('メールアドレスまたはパスワードが間違っています')
        setLoading(false)
        return
      }
      router.push('/home')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] py-10">
      <div className="mx-auto max-w-md rounded-[40px] border border-slate-200 bg-white p-6 shadow-[0_20px_80px_-35px_rgba(15,23,42,0.25)]">
        <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">つくほーむ</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-950">loginpage</h1>
        </div>

        <div className="mt-6 rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-center text-white">
          <p className="text-sm font-semibold">つくほーむ</p>
        </div>

        <div className="mt-6 rounded-[32px] border border-slate-200 bg-slate-50 p-2">
          <div className="grid grid-cols-2 gap-1 rounded-[28px] bg-slate-50 p-1">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`rounded-[28px] px-4 py-3 text-sm font-semibold transition ${
                  mode === m ? 'bg-slate-950 text-white shadow' : 'text-slate-500'
                }`}
              >
                {m === 'login' ? 'login' : '新規登録'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-[28px] border border-slate-300 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[28px] border border-slate-300 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              placeholder="pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full rounded-[28px] border border-slate-300 bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
            />
          </div>

          {mode === 'signup' && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900" />
              利用規約に同意する
            </label>
          )}

          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password || (mode === 'signup' && !displayName.trim())}
            className="mt-2 w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="mr-2 inline-block animate-spin" />}
            {mode === 'login' ? 'login' : '新規登録'}
          </button>
        </div>

        <div className="mt-6 rounded-[32px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">安心・安全</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">登録情報は大切に管理され、すぐに予定やお知らせを確認できます。</p>
        </div>

        <div className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">新規登録 / プライバシーポリシー</p>
          <div className="mt-4 rounded-[28px] bg-slate-100 p-4 text-center text-sm text-slate-600">ようこそ！</div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="relative h-36 w-36">
            <Image src={Character} alt="つくほーむキャラクター" fill className="object-contain" />
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
