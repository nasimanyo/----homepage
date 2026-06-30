import Image from 'next/image'
import Character from '@/app/images/tukkun.png'

type MascotProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  speech?: string
  className?: string
}

const sizes = {
  sm: 'h-36 w-36 sm:h-40 sm:w-40',
  md: 'h-48 w-48 sm:h-52 sm:w-52',
  lg: 'h-56 w-56 sm:h-64 sm:w-64 md:h-72 md:w-72',
  xl: 'h-64 w-64 sm:h-72 sm:w-72 md:h-[20rem] md:w-[20rem]',
  hero: 'h-[min(80vw,18rem)] w-[min(80vw,18rem)] sm:h-[20rem] sm:w-[20rem] md:h-[22rem] md:w-[22rem]',
}

export function Mascot({ size = 'md', speech, className = '' }: MascotProps) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {speech && (
        <div className="relative mb-2 rounded-2xl border-2 border-[var(--tsuku-orange)] bg-white px-4 py-2 text-sm font-semibold text-[var(--tsuku-text)] shadow-sm sm:mb-3 sm:text-base">
          {speech}
          <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[var(--tsuku-orange)] bg-white" />
        </div>
      )}
      <div className={`relative ${sizes[size]}`}>
        <Image
          src={Character}
          alt="つっくん"
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 432px, 480px"
          className="object-contain drop-shadow-md"
          priority={size === 'hero' || size === 'xl' || size === 'lg'}
        />
      </div>
    </div>
  )
}
