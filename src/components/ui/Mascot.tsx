import Image from 'next/image'
import Character from '@/app/images/tukkun.png'

type MascotProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  speech?: string
  className?: string
}

const sizes = {
  sm: { box: 'h-28 w-28 sm:h-32 sm:w-32', img: 128 },
  md: { box: 'h-40 w-40 sm:h-48 sm:w-48', img: 192 },
  lg: { box: 'h-52 w-52 sm:h-60 sm:w-60 md:h-64 md:w-64', img: 256 },
  xl: { box: 'h-60 w-60 sm:h-72 sm:w-72 md:h-80 md:w-80', img: 320 },
}

export function Mascot({ size = 'md', speech, className = '' }: MascotProps) {
  const s = sizes[size]

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {speech && (
        <div className="relative mb-3 rounded-2xl border-2 border-[var(--tsuku-orange)] bg-white px-4 py-2 text-sm font-semibold text-[var(--tsuku-text)] shadow-sm sm:px-5 sm:py-2.5 sm:text-base">
          {speech}
          <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[var(--tsuku-orange)] bg-white" />
        </div>
      )}
      <div className={`relative ${s.box}`}>
        <Image
          src={Character}
          alt="つっくん"
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-contain drop-shadow-md"
          priority={size === 'lg' || size === 'xl'}
        />
      </div>
    </div>
  )
}
