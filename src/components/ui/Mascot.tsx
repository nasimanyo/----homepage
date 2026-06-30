import Image from 'next/image'
import Character from '@/app/images/tukkun.png'

type MascotProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  speech?: string
  className?: string
}

const sizes = {
  sm: 'h-40 w-40 sm:h-44 sm:w-44',
  md: 'h-52 w-52 sm:h-56 sm:w-56',
  lg: 'h-64 w-64 sm:h-72 sm:w-72 md:h-80 md:w-80',
  xl: 'h-72 w-72 sm:h-80 sm:w-80 md:h-[22rem] md:w-[22rem]',
  hero: 'h-[min(86vw,20rem)] w-[min(86vw,20rem)] sm:h-[22rem] sm:w-[22rem] md:h-[24rem] md:w-[24rem]',
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
