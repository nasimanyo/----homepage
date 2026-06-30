'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'
import { LogOut, Settings, ShieldCheck, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/components/ui/AppHeader'
import { Mascot } from '@/components/ui/Mascot'
import { PageShell } from '@/components/ui/PageShell'

export default function MyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('profile query error', profileError)
      }

      if (!profileData) {
        const defaultName = user.email?.split('@')[0] || 'ユーザー'
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: defaultName,
            points: 0,
            last_login_bonus_date: null,
            last_roulette_date: null,
          })
          .select('*')
          .single()

        if (insertError || !newProfile) {
          setLoading(false)
          return
        }

        setProfile(newProfile)
        setEditName(newProfile.display_name || '')
      } else {
        setProfile(profileData)
        setEditName(profileData.display_name || '')
      }

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
    <PageShell>
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={32} />
      </div>
    </PageShell>
  )

  return (
    <PageShell>
      <AppHeader />

      <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-center">
        <section className="tsuku-card p-6 text-center sm:p-8">
          <p className="text-lg font-bold text-[var(--tsuku-text)]">
            Hello!! {profile?.display_name || 'ユーザー'} さん
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--tsuku-orange-light)] px-5 py-2">
            <Sparkles size={16} className="text-[var(--tsuku-orange)]" />
            <span className="text-sm font-bold text-[var(--tsuku-text)]">
              つくポイント {profile?.points ?? 0} pt
            </span>
          </div>
          {profile?.is_admin && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-[var(--tsuku-text-muted)]">
              <ShieldCheck size={12} /> 管理者
            </span>
          )}
          <p className="mt-4 text-xs text-[var(--tsuku-text-muted)]">
            ログインボーナス・ルーレットはホーム画面からどうぞ
          </p>
        </section>

        <div className="flex justify-center md:justify-end">
          <Mascot size="xl" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        className="tsuku-card mt-6 flex w-full items-center justify-center gap-2 p-4 text-sm font-semibold text-[var(--tsuku-text)] transition hover:bg-stone-50"
      >
        <Settings size={18} className="text-[var(--tsuku-text-muted)]" />
        詳細設定
      </button>

      {showSettings && (
        <section className="tsuku-card mt-4 space-y-4 p-5 sm:p-6">
          <div className="rounded-xl border border-[var(--tsuku-border)] bg-stone-50 p-4">
            <h3 className="text-sm font-bold text-[var(--tsuku-text)]">表示名を変更</h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="tsuku-input flex-1"
                placeholder="新しい表示名"
              />
              <button
                onClick={saveName}
                disabled={saving || editName === profile?.display_name}
                className="tsuku-btn px-4 py-2.5 text-sm"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          {profile?.is_admin && (
            <Link href="/admin" className="block">
              <div className="rounded-xl border-2 border-[var(--tsuku-orange)] bg-[var(--tsuku-orange-light)] p-4 transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-[var(--tsuku-orange-dark)]" />
                  <div>
                    <p className="text-sm font-bold text-[var(--tsuku-text)]">管理者パネルを開く</p>
                    <p className="text-xs text-[var(--tsuku-text-muted)]">予定合わせの作成やお知らせ投稿</p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-100"
          >
            <LogOut size={16} /> ログアウト
          </button>
        </section>
      )}
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
