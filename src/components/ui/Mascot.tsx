import Image from 'next/image'
import Character from '@/app/images/tukkun.png'

type MascotProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  speech?: string
  className?: string
}

const sizes = {
  sm: 'h-34 w-34 sm:h-38 sm:w-38',
  md: 'h-46 w-46 sm:h-50 sm:w-50',
  lg: 'h-54 w-54 sm:h-62 sm:w-62 md:h-70 md:w-70',
  xl: 'h-62 w-62 sm:h-70 sm:w-70 md:h-[18rem] md:w-[18rem]',
  hero: 'h-[min(78vw,16rem)] w-[min(78vw,16rem)] sm:h-[18rem] sm:w-[18rem] md:h-[20rem] md:w-[20rem]',
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
