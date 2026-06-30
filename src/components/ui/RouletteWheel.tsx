'use client'

const SEGMENTS = [
  { color: '#FF6B6B', label: '10' },
  { color: '#4ECDC4', label: '25' },
  { color: '#FFE66D', label: '50' },
  { color: '#95E1D3', label: '75' },
  { color: '#A78BFA', label: '100' },
  { color: '#F97316', label: '30' },
  { color: '#60A5FA', label: '15' },
  { color: '#34D399', label: '40' },
]

const SPIN_DURATION_MS = 3200

type RouletteWheelProps = {
  spinning?: boolean
  rotation?: number
}

export function RouletteWheel({ spinning = false, rotation = 0 }: RouletteWheelProps) {
  const segmentAngle = 360 / SEGMENTS.length

  return (
    <div className="relative mx-auto h-56 w-56 sm:h-64 sm:w-64">
      <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" aria-hidden>
        <div className="h-0 w-0 border-x-[10px] border-x-transparent border-t-[18px] border-t-red-500 drop-shadow" />
      </div>

      <div
        className="h-full w-full rounded-full border-4 border-[var(--tsuku-text)] shadow-lg will-change-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`
            : 'none',
        }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {SEGMENTS.map((seg, i) => {
            const startAngle = (i * segmentAngle - 90) * (Math.PI / 180)
            const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180)
            const x1 = 100 + 95 * Math.cos(startAngle)
            const y1 = 100 + 95 * Math.sin(startAngle)
            const x2 = 100 + 95 * Math.cos(endAngle)
            const y2 = 100 + 95 * Math.sin(endAngle)
            const largeArc = segmentAngle > 180 ? 1 : 0
            const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180)
            const tx = 100 + 60 * Math.cos(midAngle)
            const ty = 100 + 60 * Math.sin(midAngle)

            return (
              <g key={i}>
                <path
                  d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={seg.color}
                  stroke="#1a1a1a"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#1a1a1a"
                  fontSize="11"
                  fontWeight="bold"
                  transform={`rotate(${i * segmentAngle + segmentAngle / 2}, ${tx}, ${ty})`}
                >
                  {seg.label}
                </text>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="12" fill="#1a1a1a" />
          <circle cx="100" cy="100" r="8" fill="#fff" />
        </svg>
      </div>
    </div>
  )
}

export const ROULETTE_SPIN_DURATION_MS = SPIN_DURATION_MS

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export async function triggerWheelSpin(
  currentRotation: number,
  setSpinning: (v: boolean) => void,
  setRotation: (v: number | ((prev: number) => number)) => void,
) {
  setSpinning(false)
  setRotation(currentRotation % 360)
  await waitForNextFrame()
  const extra = 1800 + Math.random() * 360
  setSpinning(true)
  setRotation((prev) => prev + extra)
  await new Promise((resolve) => setTimeout(resolve, SPIN_DURATION_MS))
  setSpinning(false)
}
