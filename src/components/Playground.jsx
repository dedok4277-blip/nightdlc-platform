import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Wand2, Skull, Flame, Snowflake } from 'lucide-react'

const PRESETS = [
  { name: 'Soft', glow: 0.10, icon: Snowflake },
  { name: 'Violet', glow: 0.16, icon: Sparkles },
  { name: 'Rage', glow: 0.22, icon: Flame },
  { name: 'Nelon', glow: 0.14, icon: Skull },
]

export default function Playground() {
  const [idx, setIdx] = useState(1)
  const preset = useMemo(() => PRESETS[idx], [idx])

  useEffect(() => {
    document.documentElement.style.setProperty('--violet-glow-k', String(preset.glow))
  }, [preset.glow])

  return (
    <div className="panel panelDeep playground">
      <div className="playHead">
        <div className="panelTitle">Playground</div>
        <div className="playHint">Tap presets to change glow intensity.</div>
      </div>
      <div className="playRow">
        {PRESETS.map((p, i) => {
          const Icon = p.icon
          return (
            <button
              key={p.name}
              type="button"
              className={`playChip ${i === idx ? 'playChipOn' : ''}`}
              onClick={() => setIdx(i)}
            >
              <Icon size={16} />
              <span>{p.name}</span>
            </button>
          )
        })}
        <button
          type="button"
          className="playChip"
          onClick={() => setIdx((n) => (n + 1) % PRESETS.length)}
          title="Random-ish"
        >
          <Wand2 size={16} />
          <span>Mix</span>
        </button>
      </div>
    </div>
  )
}
