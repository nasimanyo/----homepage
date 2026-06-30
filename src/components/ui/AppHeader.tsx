import { Home } from 'lucide-react'

type AppHeaderProps = {
  subtitle?: string
  showHouse?: boolean
  align?: 'center' | 'left'
}

export function AppHeader({ subtitle, showHouse = true, align = 'center' }: AppHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left'

  return (
    <header className={alignClass}>
      <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : ''}`}>
        {showHouse && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--tsuku-orange-light)] text-[var(--tsuku-orange)] sm:h-9 sm:w-9">
            <Home size={16} strokeWidth={2.5} className="sm:h-[18px] sm:w-[18px]" />
          </span>
        )}
        <h1 className="text-xl font-bold tracking-wide text-[var(--tsuku-text)] sm:text-2xl">つくほーむ</h1>
      </div>
      {subtitle && (
        <p className="mt-1 text-sm font-medium text-[var(--tsuku-text-muted)] sm:text-base">{subtitle}</p>
      )}
    </header>
  )
}
