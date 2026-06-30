'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, Info, User } from 'lucide-react'

const PAGE_LABELS: Record<string, string> = {
  '/home': 'ホーム',
  '/schedule': '予定',
  '/info': '情報',
  '/mypage': 'マイページ',
  '/login': 'ログイン',
}

const NAV_ITEMS = [
  { href: '/home', label: 'つくほーむ', icon: Home },
  { href: '/schedule', label: '予定', icon: CalendarDays },
  { href: '/info', label: '情報', icon: Info },
  { href: '/mypage', label: 'マイページ', icon: User },
]

export function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    document.title = 'つくほーむ'

    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem('recent-pages')
    const pages = stored ? JSON.parse(stored) : []
    const nextPage = { href: pathname, label: PAGE_LABELS[pathname] || 'ページ' }
    const filtered = (pages as Array<{ href: string; label: string }>).filter((page) => page.href !== nextPage.href)
    const updated = [nextPage, ...filtered].slice(0, 5)
    window.localStorage.setItem('recent-pages', JSON.stringify(updated))
  }, [pathname])

  return null
}

export function BottomNav() {
  const pathname = usePathname()
  const hideNav = ['/login', '/admin', '/auth'].some((p) => pathname.startsWith(p))

  if (hideNav) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--tsuku-border)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center gap-1 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] leading-tight transition-colors ${
                active
                  ? 'bg-[var(--tsuku-orange-light)] text-[var(--tsuku-orange-dark)]'
                  : 'text-[var(--tsuku-text-muted)] hover:bg-stone-50'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className={active ? 'font-bold' : 'font-medium'}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
