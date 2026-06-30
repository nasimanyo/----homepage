import Image from 'next/image'
import Character from '@/app/images/tukkun.png'

type MascotProps = {
  size?: 'sm' | 'md' | 'lg'
  speech?: string
  className?: string
}

const sizes = {
  sm: { box: 'h-20 w-20', img: 80 },
  md: { box: 'h-32 w-32', img: 128 },
  lg: { box: 'h-44 w-44', img: 176 },
}

export function Mascot({ size = 'md', speech, className = '' }: MascotProps) {
  const s = sizes[size]

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {speech && (
        <div className="relative mb-3 rounded-2xl border-2 border-[var(--tsuku-orange)] bg-white px-4 py-2 text-sm font-semibold text-[var(--tsuku-text)] shadow-sm">
          {speech}
          <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[var(--tsuku-orange)] bg-white" />
        </div>
      )}
      <div className={`relative ${s.box}`}>
        <Image
          src={Character}
          alt="つくほーむキャラクター"
          width={s.img}
          height={s.img}
          className="object-contain drop-shadow-md"
        />
      </div>
    </div>
  )
}
