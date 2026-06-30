import { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function PageShell({ children, className = '', noPadding = false }: PageShellProps) {
  return (
    <div className={`min-h-screen bg-[var(--tsuku-bg)] ${className}`}>
      <div className={`mx-auto max-w-md ${noPadding ? '' : 'px-4 py-6'}`}>
        {children}
      </div>
    </div>
  )
}
