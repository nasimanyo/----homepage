'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'
import { User, LogOut, Settings, ShieldCheck, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">👤 マイページ</h1>
      </header>

      <main className="px-4 py-6 space-y-4">
        {/* アバター */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
            <User size={36} className="text-violet-400" />
          </div>
          <p className="font-bold text-gray-800 text-lg">{profile?.display_name}</p>
          {profile?.is_admin && (
            <span className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-medium">
              <ShieldCheck size={12} /> 管理者
            </span>
          )}
        </div>

        {/* 名前変更 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Settings size={15} /> 表示名を変更
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
            />
            <button
              onClick={saveName}
              disabled={saving || editName === profile?.display_name}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {saving ? '...' : '保存'}
            </button>
          </div>
        </div>

        {/* 管理者パネルへ */}
        {profile?.is_admin && (
          <Link href="/admin">
            <div className="bg-violet-600 rounded-2xl p-4 text-white flex items-center gap-3">
              <ShieldCheck size={20} />
              <div>
                <p className="font-bold text-sm">管理者パネルを開く</p>
                <p className="text-xs text-violet-200">予定合わせの作成・お知らせ投稿</p>
              </div>
            </div>
          </Link>
        )}

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-2xl border border-gray-200 text-red-500 text-sm font-medium shadow-sm"
        >
          <LogOut size={16} /> ログアウト
        </button>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
