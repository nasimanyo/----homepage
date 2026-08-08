'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, ScanLine, XCircle } from 'lucide-react'
import { PageShell } from '@/components/ui/PageShell'

export default function ScanPageClient() {
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<any>(null)
  const [status, setStatus] = useState('カメラを起動中...')
  const [processing, setProcessing] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    let isMounted = true

    async function initCamera() {
      const { data: { user } } = await client.auth.getUser()
      if (!user) {
        if (!isMounted) return
        setStatus('ログインが必要です')
        setAuthorized(false)
        return
      }

      const { data: profileData } = await client
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      const passwordAllowed = profileData?.is_admin || sessionStorage.getItem('tsuku-admin-password') === 'nasimanyo'
      if (!passwordAllowed) {
        if (!isMounted) return
        setStatus('管理者認証が必要です')
        setAuthorized(false)
        return
      }

      if (!isMounted) return
      setAuthorized(true)
      setStatus('QRコードを読み取るとポイントが付与されます。')

      try {
        const QrScanner = await import('qr-scanner')
        // @ts-ignore: qr-scanner default import typing is inconsistent with runtime
        QrScanner.default.WORKER_PATH = '/qr-scanner-worker.min.js'
        if (!videoRef.current) {
          setStatus('カメラが見つかりません')
          return
        }

        const scanner = new QrScanner.default(
          videoRef.current,
          async (result: any) => {
            if (processing) return
            setProcessing(true)
            const parsed = parseScanUrl(result)
            if (!parsed) {
              setStatus('QRコードの形式が正しくありません。もう一度試してください。')
              setProcessing(false)
              return
            }

            const { memberId, amount } = parsed
            setStatus('読み取り成功。ポイント付与中...')
            scanner.stop()

            const { data: targetProfile, error: profileError } = await client
              .from('profiles')
              .select('points')
              .eq('id', memberId)
              .maybeSingle()

            if (profileError || !targetProfile) {
              setStatus('対象会員の取得に失敗しました。')
              setProcessing(false)
              scanner.start()
              return
            }

            const nextPoints = (targetProfile.points ?? 0) + amount
            const { error: updateError } = await client
              .from('profiles')
              .update({ points: nextPoints })
              .eq('id', memberId)

            if (updateError) {
              setStatus('ポイント付与に失敗しました。')
              setProcessing(false)
              scanner.start()
              return
            }

            setStatus(`${amount}ポイントを付与しました！`)    
            setTimeout(() => router.push('/admin?tab=members'), 1000)
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        )

        scannerRef.current = scanner
        await scanner.start()
      } catch (error) {
        console.error(error)
        setStatus('カメラを起動できませんでした。ブラウザの権限を確認してください。')
      }
    }

    initCamera()

    return () => {
      isMounted = false
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [router, supabase, processing])

  function parseScanUrl(text: string) {
    try {
      const url = new URL(text, window.location.origin)
      if (url.origin !== window.location.origin) return null
      if (url.pathname !== '/scan') return null
      const memberId = url.searchParams.get('memberId')
      const amountCandidate = Number(url.searchParams.get('amount') ?? '1')
      const amount = Number.isInteger(amountCandidate) && amountCandidate > 0 ? amountCandidate : 1
      if (!memberId) return null
      return { memberId, amount }
    } catch {
      return null
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-3xl border border-[var(--tsuku-border)] bg-white p-6 text-center shadow-sm">
        <div className="rounded-full bg-[var(--tsuku-orange-light)] p-3 text-[var(--tsuku-orange)]">
          <ScanLine size={28} />
        </div>
        <h1 className="mt-4 text-lg font-bold text-[var(--tsuku-text)]">カメラでQR読み取り</h1>
        <p className="mt-2 text-sm text-[var(--tsuku-text-muted)]">管理者QRを読み込むと、該当会員にポイントを付与します。</p>

        <div className="mt-5 w-full overflow-hidden rounded-3xl border border-stone-200 bg-black">
          <video ref={videoRef} className="h-[320px] w-full object-cover" muted playsInline />
        </div>

        <div className="mt-4 text-sm font-semibold text-[var(--tsuku-orange-dark)]">
          {status}
        </div>

        {authorized === false && (
          <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-[var(--tsuku-text-muted)]">
            <div className="flex items-center justify-center gap-2">
              <XCircle size={16} /> 管理者認証が必要です
            </div>
          </div>
        )}

        {authorized && (
          <div className="mt-3 text-xs text-[var(--tsuku-text-muted)]">QRコードは会員ページの「あなたの会員QR」で発行されたURL形式を読み取る必要があります。</div>
        )}
      </div>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
