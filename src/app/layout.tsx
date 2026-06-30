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
        <div className="mx-auto min-h-screen w-full max-w-md pb-24 sm:pb-28 md:max-w-2xl lg:max-w-4xl">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
