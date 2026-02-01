import { useRef } from 'react'

export default function SpotlightCard({ className = '', children }) {
  const ref = useRef(null)

  function onMove(e) {
    const el = ref.current
    if (!el) return

    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
  }

  return (
    <div ref={ref} className={`spotCard ${className}`} onMouseMove={onMove}>
      {children}
    </div>
  )
}
