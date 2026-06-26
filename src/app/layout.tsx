'use client'

import './globals.css'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, CalendarDays, Info, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/home', label: 'つくほーむ', icon: Home },
  { href: '/schedule', label: '予定', icon: CalendarDays },
  { href: '/info', label: '情報', icon: Info },
  { href: '/mypage', label: 'マイページ', icon: User },
]

function BottomNav() {
  const pathname = usePathname()
  const hideNav = ['/login', '/admin', '/auth'].some(p => pathname.startsWith(p))
  if (hideNav) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-lg">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.title = 'つくほーむ'
  }, [])

  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 font-sans">
        <div className="mx-auto min-h-screen max-w-lg pb-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
