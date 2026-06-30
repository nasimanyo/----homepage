import './globals.css'
import { BottomNav, PageTracker } from '@/components/ClientShell'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[var(--tsuku-bg)] text-[var(--tsuku-text)]">
        <PageTracker />
        <div className="mx-auto min-h-screen w-full max-w-lg pb-24">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
