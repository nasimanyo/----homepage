import './globals.css'
import { BottomNav, PageTracker } from '@/components/ClientShell'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 font-sans text-[15px] leading-7 text-gray-900 sm:text-[16px] sm:leading-8">
        <PageTracker />
        <div className="mx-auto min-h-screen w-full max-w-5xl px-3 pb-24 pt-2 sm:px-6 sm:pt-4 md:px-8 md:pb-24">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
