import { Suspense } from 'react'
import ScanPageClient from './ScanPageClient'

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">読み込み中...</div>}>
      <ScanPageClient />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
