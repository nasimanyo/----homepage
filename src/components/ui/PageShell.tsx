import { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function PageShell({ children, className = '', noPadding = false }: PageShellProps) {
  return (
    <div className={`min-h-screen bg-[var(--tsuku-bg)] ${className}`}>
      <div
        className={
          noPadding
            ? 'mx-auto w-full max-w-md md:max-w-2xl lg:max-w-4xl'
            : 'mx-auto w-full max-w-md px-4 py-6 sm:px-6 md:max-w-2xl md:px-8 md:py-8 lg:max-w-4xl lg:py-10'
        }
      >
        {children}
      </div>
    </div>
  )
}
