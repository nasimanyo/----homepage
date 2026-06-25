'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setError('')
    setLoading(true)

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
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-violet-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">あつまり</h1>
          <p className="text-sm text-gray-400 mt-1">幼馴染の予定管理アプリ</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          {/* Mode switch */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === m ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-400'
                }`}
              >
                {m === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  placeholder="表示名（例: なしまん）"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-violet-400"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="password"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="w-full mt-4 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
