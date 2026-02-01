import { useMemo } from 'react'

function rand(min, max, seed) {
  const x = Math.sin(seed) * 10000
  const r = x - Math.floor(x)
  return min + r * (max - min)
}

export default function ShatterTitle({ text = 'NelonDLC' }) {
  const letters = useMemo(() => {
    return Array.from(text).map((ch, i) => {
      const seed = i * 17.13 + ch.charCodeAt(0)
      return {
        ch,
        i,
        dx: rand(-26, 26, seed + 1),
        dy: rand(-22, 22, seed + 2),
        rz: rand(-18, 18, seed + 3),
        delay: rand(0, 220, seed + 4),
      }
    })
  }, [text])

  return (
    <div className="shatter" aria-label={text}>
      {letters.map((l) => (
        <span
          key={l.i}
          className="shatterChar"
          style={{
            '--dx': `${l.dx}px`,
            '--dy': `${l.dy}px`,
            '--rz': `${l.rz}deg`,
            '--d': `${Math.round(l.delay)}ms`,
          }}
        >
          {l.ch === ' ' ? '\u00A0' : l.ch}
        </span>
      ))}
    </div>
  )
}
