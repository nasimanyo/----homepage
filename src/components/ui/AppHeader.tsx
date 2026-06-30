import { Home } from 'lucide-react'

type AppHeaderProps = {
  subtitle?: string
  showHouse?: boolean
}

export function AppHeader({ subtitle, showHouse = true }: AppHeaderProps) {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-2">
        {showHouse && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--tsuku-orange-light)] text-[var(--tsuku-orange)]">
            <Home size={16} strokeWidth={2.5} />
          </span>
        )}
        <h1 className="text-xl font-bold tracking-wide text-[var(--tsuku-text)]">つくほーむ</h1>
      </div>
      {subtitle && (
        <p className="mt-1 text-sm font-medium text-[var(--tsuku-text-muted)]">{subtitle}</p>
      )}
    </header>
  )
}
