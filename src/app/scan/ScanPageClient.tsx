'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, ScanLine } from 'lucide-react'
import { PageShell } from '@/components/ui/PageShell'

export default function ScanPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = typeof window === 'undefined' ? null : createClient()
  const memberId = searchParams.get('memberId')
  const [status, setStatus] = useState('読み取り中...')

  const canProcess = useMemo(() => Boolean(memberId), [memberId])

  useEffect(() => {
    if (!canProcess || !supabase) return

    async function processScan() {
      if (!supabase) {
        setStatus('接続エラーです')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('ログインが必要です')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      const passwordAllowed = profileData?.is_admin || sessionStorage.getItem('tsuku-admin-password') === 'nasimanyo'
      if (!passwordAllowed) {
        setStatus('管理者認証が必要です')
        return
      }

      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', memberId)
        .maybeSingle()

      if (!targetProfile) {
        setStatus('対象会員が見つかりません')
        return
      }

      const nextPoints = (targetProfile.points ?? 0) + 1
      await supabase.from('profiles').update({ points: nextPoints }).eq('id', memberId)
      setStatus('ポイントを付与しました')
      setTimeout(() => router.push('/admin?tab=members'), 800)
    }

    processScan()
  }, [canProcess, memberId, router, supabase])

  return (
    <PageShell>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-3xl border border-[var(--tsuku-border)] bg-white p-6 text-center shadow-sm">
        <div className="rounded-full bg-[var(--tsuku-orange-light)] p-3 text-[var(--tsuku-orange)]">
          <ScanLine size={28} />
        </div>
        <h1 className="mt-4 text-lg font-bold text-[var(--tsuku-text)]">QR読み取り</h1>
        <p className="mt-2 text-sm text-[var(--tsuku-text-muted)]">会員のQRコードを読み込んでポイントを付与します。</p>
        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--tsuku-orange-dark)]">
          <Loader2 className="animate-spin" size={18} />
          {status}
        </div>
      </div>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
