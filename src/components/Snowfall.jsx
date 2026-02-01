import { useMemo } from 'react'

function rand(min, max) {
  return Math.random() * (max - min) + min
}

export default function Snowfall() {
  const flakes = useMemo(() => {
    const count = 36
    return Array.from({ length: count }, (_, i) => {
      const size = rand(1.2, 3.2)
      const left = rand(0, 100)
      const dur = rand(8, 18)
      const delay = rand(0, 12)
      const drift = rand(-20, 20)
      const opacity = rand(0.08, 0.18)
      return { id: i, size, left, dur, delay, drift, opacity }
    })
  }, [])

  return (
    <div className="snow" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="flake"
          style={{
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: f.opacity,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
            '--drift': `${f.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
