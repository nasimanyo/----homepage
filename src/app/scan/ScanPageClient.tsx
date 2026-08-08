'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, ScanLine, XCircle } from 'lucide-react'
import { PageShell } from '@/components/ui/PageShell'
import type { Profile } from '@/types'

export default function ScanPageClient() {
  const router = useRouter()
  const supabase = typeof window === 'undefined' ? null : createClient()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<any>(null)
  const [status, setStatus] = useState('カメラを起動中...')
  const [processing, setProcessing] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [scannedAmount, setScannedAmount] = useState(1)
  const [operateAmount, setOperateAmount] = useState(1)
  const [actionStatus, setActionStatus] = useState('')
  const [scanActive, setScanActive] = useState(true)

  useEffect(() => {
    if (!supabase || !scanActive) return

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
      setStatus('QRコードを読み取ると会員管理画面が表示されます。')

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
            scanner.stop()
            setScanActive(false)
            setStatus('読み取り成功。会員データを読み込んでいます...')

            const { data: targetProfile, error: profileError } = await client
              .from('profiles')
              .select('id, username, display_name, points, is_admin, created_at')
              .eq('id', memberId)
              .maybeSingle()

            if (profileError || !targetProfile) {
              setStatus('対象会員の取得に失敗しました。')
              setProcessing(false)
              setScanActive(true)
              return
            }

            setSelectedProfile(targetProfile)
            setScannedAmount(amount)
            setOperateAmount(amount > 0 ? amount : 1)
            setStatus('会員を読み込みました。操作してください。')
            setProcessing(false)
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
  }, [router, supabase, scanActive, processing])

  function parseScanUrl(text: string | { data?: string } | null | undefined) {
    const raw = typeof text === 'string' ? text : text?.data
    if (!raw || typeof raw !== 'string') return null

    const trimmed = raw.trim()
    if (!trimmed) return null

    try {
      const url = new URL(trimmed, window.location.origin)
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

  async function updateProfilePoints(nextPoints: number) {
    if (!supabase || !selectedProfile) return false
    const { error } = await supabase
      .from('profiles')
      .update({ points: nextPoints })
      .eq('id', selectedProfile.id)
    if (error) {
      setActionStatus('ポイント更新に失敗しました。')
      return false
    }
    setSelectedProfile({ ...selectedProfile, points: nextPoints })
    return true
  }

  async function addPoints() {
    if (!selectedProfile || !supabase) return
    const nextPoints = (selectedProfile.points ?? 0) + operateAmount
    setActionStatus('ポイント付与中...')
    const success = await updateProfilePoints(nextPoints)
    if (success) {
      setActionStatus(`${operateAmount}ポイントを追加しました。現在 ${nextPoints} pt`)    
    }
  }

  async function setPoints() {
    if (!selectedProfile || !supabase) return
    const nextPoints = operateAmount >= 0 ? operateAmount : 0
    setActionStatus('ポイントを設定中...')
    const success = await updateProfilePoints(nextPoints)
    if (success) {
      setActionStatus(`ポイントを ${nextPoints} pt に設定しました。`)
    }
  }

  async function resetPoints() {
    if (!selectedProfile || !supabase) return
    setActionStatus('ポイントをリセット中...')
    const success = await updateProfilePoints(0)
    if (success) {
      setActionStatus('ポイントを 0 pt にリセットしました。')
      setOperateAmount(0)
    }
  }

  function restartScan() {
    setSelectedProfile(null)
    setScannedAmount(1)
    setOperateAmount(1)
    setActionStatus('カメラを再起動しています...')
    setStatus('カメラを起動中...')
    setScanActive(true)
  }

  return (
    <PageShell>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center rounded-3xl border border-[var(--tsuku-border)] bg-white p-6 text-center shadow-sm">
        <div className="rounded-full bg-[var(--tsuku-orange-light)] p-3 text-[var(--tsuku-orange)]">
          <ScanLine size={28} />
        </div>
        <h1 className="mt-4 text-lg font-bold text-[var(--tsuku-text)]">会員管理QR</h1>
        <p className="mt-2 text-sm text-[var(--tsuku-text-muted)]">会員QRを読み取ると、管理メニューからポイント操作ができます。</p>

        {!selectedProfile && (
          <>
            <div className="mt-5 w-full overflow-hidden rounded-3xl border border-stone-200 bg-black">
              <video ref={videoRef} className="h-[320px] w-full object-cover" muted playsInline />
            </div>
            <div className="mt-4 text-sm font-semibold text-[var(--tsuku-orange-dark)]">{status}</div>
          </>
        )}

        {selectedProfile && (
          <div className="w-full space-y-4 text-left">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm text-[var(--tsuku-text-muted)]">会員ID</p>
              <p className="mt-1 text-base font-semibold text-[var(--tsuku-text)]">{selectedProfile.id}</p>
              <p className="mt-3 text-sm text-[var(--tsuku-text-muted)]">表示名</p>
              <p className="mt-1 text-base font-semibold text-[var(--tsuku-text)]">{selectedProfile.display_name}</p>
              {selectedProfile.username && (
                <>
                  <p className="mt-3 text-sm text-[var(--tsuku-text-muted)]">ユーザーネーム</p>
                  <p className="mt-1 text-base font-semibold text-[var(--tsuku-text)]">@{selectedProfile.username}</p>
                </>
              )}
              <p className="mt-3 text-sm text-[var(--tsuku-text-muted)]">現在のポイント</p>
              <p className="mt-1 text-base font-semibold text-[var(--tsuku-text)]">{selectedProfile.points ?? 0} pt</p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-4">
              <label className="text-sm font-semibold text-[var(--tsuku-text)]">操作ポイント</label>
              <input
                type="number"
                min={0}
                value={operateAmount}
                onChange={(e) => setOperateAmount(Number(e.target.value))}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  onClick={addPoints}
                  className="rounded-2xl bg-[var(--tsuku-orange-light)] px-3 py-3 text-sm font-semibold text-[var(--tsuku-orange-dark)]"
                >
                  追加
                </button>
                <button
                  onClick={setPoints}
                  className="rounded-2xl bg-[var(--tsuku-orange-light)] px-3 py-3 text-sm font-semibold text-[var(--tsuku-orange-dark)]"
                >
                  設定
                </button>
                <button
                  onClick={resetPoints}
                  className="rounded-2xl bg-[var(--tsuku-border)] px-3 py-3 text-sm font-semibold text-[var(--tsuku-text)]"
                >
                  0にリセット
                </button>
              </div>
              {actionStatus && (
                <p className="mt-3 text-sm text-[var(--tsuku-text-muted)]">{actionStatus}</p>
              )}
            </div>

            <button
              onClick={restartScan}
              className="mt-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-[var(--tsuku-text)]"
            >
              別のQRを読み取る
            </button>
          </div>
        )}

        {authorized === false && (
          <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-[var(--tsuku-text-muted)]">
            <div className="flex items-center justify-center gap-2">
              <XCircle size={16} /> 管理者認証が必要です
            </div>
          </div>
        )}

        {authorized && !selectedProfile && (
          <div className="mt-3 text-xs text-[var(--tsuku-text-muted)]">会員QRをかざして読み取ってください。</div>
        )}
      </div>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
