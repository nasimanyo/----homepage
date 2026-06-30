'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AppHeader } from '@/components/ui/AppHeader'
import { Mascot } from '@/components/ui/Mascot'
import { PageShell } from '@/components/ui/PageShell'

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

  const canSubmit =
    email &&
    password &&
    (mode === 'login' || displayName.trim())

  return (
    <PageShell>
      <div className="tsuku-card p-6 sm:p-8 md:max-w-lg md:mx-auto">
        <AppHeader subtitle={mode === 'login' ? 'loginpage' : undefined} />

        <div className="mt-8 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--tsuku-text-muted)]">name:</label>
              <input
                type="text"
                placeholder="なまえ"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="tsuku-input"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--tsuku-text-muted)]">mail:</label>
            <input
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tsuku-input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--tsuku-text-muted)]">pass:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              className="tsuku-input"
            />
          </div>

          {mode === 'signup' && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--tsuku-text)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 accent-[var(--tsuku-orange)]"
              />
              利用規約に同意する（下記リンク）
            </label>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="tsuku-btn w-full px-5 py-3.5 text-sm"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'login' : '新規登録'}
          </button>
        </div>

        <div className="mt-8 flex justify-center md:mt-10">
          <Mascot
            size="hero"
            speech={mode === 'signup' ? 'ようこそ！' : undefined}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => { setMode('signup'); setError('') }}
              className="font-semibold text-[var(--tsuku-orange-dark)] underline-offset-2 hover:underline"
            >
              新規登録
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className="font-semibold text-[var(--tsuku-text-muted)] underline-offset-2 hover:underline"
            >
              ログインに戻る
            </button>
          )}
          <span className="text-stone-300">|</span>
          <Link
            href="/terms"
            className="text-[var(--tsuku-text-muted)] underline-offset-2 hover:underline"
          >
            利用規約
          </Link>
          <span className="text-stone-300">|</span>
          <Link
            href="/privacy"
            className="text-[var(--tsuku-text-muted)] underline-offset-2 hover:underline"
          >
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
