import { useEffect, useRef } from 'react'

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function expRamp(g, t0, v0, t1, v1) {
  try {
    g.setValueAtTime(Math.max(0.0001, v0), t0)
    g.exponentialRampToValueAtTime(Math.max(0.0001, v1), t1)
  } catch {
    g.setValueAtTime(v0, t0)
    g.linearRampToValueAtTime(v1, t1)
  }
}

export default function SoundManager() {
  const ctxRef = useRef(null)
  const masterRef = useRef(null)
  const fxRef = useRef(null)
  const noiseRef = useRef(null)
  const startedRef = useRef(false)
  const lastHoverRef = useRef(0)
  const lastScrollRef = useRef(0)

  function ensure() {
    if (startedRef.current) return true
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return false
      const ctx = new Ctx()
      const master = ctx.createGain()
      master.gain.value = 0.8

      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -24
      comp.knee.value = 24
      comp.ratio.value = 6
      comp.attack.value = 0.006
      comp.release.value = 0.18

      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 14000
      lp.Q.value = 0.6

      const delay = ctx.createDelay(0.35)
      delay.delayTime.value = 0.12
      const fb = ctx.createGain()
      fb.gain.value = 0.18
      const wet = ctx.createGain()
      wet.gain.value = 0.22
      const dry = ctx.createGain()
      dry.gain.value = 0.88

      delay.connect(fb)
      fb.connect(delay)

      const fxIn = ctx.createGain()
      fxIn.connect(dry)
      fxIn.connect(delay)
      delay.connect(wet)

      dry.connect(lp)
      wet.connect(lp)
      lp.connect(comp)
      comp.connect(master)
      master.connect(ctx.destination)

      ctxRef.current = ctx
      masterRef.current = master
      fxRef.current = fxIn

      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.35
      }
      noiseRef.current = noiseBuffer

      const bgGain = ctx.createGain()
      bgGain.gain.value = 0.0
      bgGain.connect(fxIn)

      const bg1 = ctx.createOscillator()
      bg1.type = 'sine'
      bg1.frequency.value = 52
      const bg2 = ctx.createOscillator()
      bg2.type = 'triangle'
      bg2.frequency.value = 104
      const bg3 = ctx.createOscillator()
      bg3.type = 'sine'
      bg3.frequency.value = 156
      bg1.connect(bgGain)
      bg2.connect(bgGain)
      bg3.connect(bgGain)
      bg1.start()
      bg2.start()
      bg3.start()

      const hiss = ctx.createBufferSource()
      hiss.buffer = noiseBuffer
      hiss.loop = true
      const hissGain = ctx.createGain()
      hissGain.gain.value = 0.0
      const hissLP = ctx.createBiquadFilter()
      hissLP.type = 'lowpass'
      hissLP.frequency.value = 1800
      hissLP.Q.value = 0.7
      hiss.connect(hissGain)
      hissGain.connect(hissLP)
      hissLP.connect(bgGain)
      hiss.start()

      const t = ctx.currentTime
      bgGain.gain.setValueAtTime(0.0, t)
      bgGain.gain.linearRampToValueAtTime(0.012, t + 0.8)
      hissGain.gain.setValueAtTime(0.0, t)
      hissGain.gain.linearRampToValueAtTime(0.020, t + 1.1)

      startedRef.current = true
      return true
    } catch {
      return false
    }
  }

  function ping({ f = 520, type = 'sine', g = 0.06, ms = 60, to = null, pan = 0 }) {
    const ctx = ctxRef.current
    const fx = fxRef.current
    if (!ctx || !fx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    const now = ctx.currentTime

    osc.type = type
    osc.frequency.setValueAtTime(f, now)
    if (to != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, Number(to)), now + ms / 1000)
    }

    const amp = clamp(g, 0, 0.12)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(amp, now + 0.006)
    expRamp(gain.gain, now + 0.006, amp, now + ms / 1000, 0.0001)

    if (panner) {
      panner.pan.value = clamp(pan, -1, 1)
      osc.connect(gain)
      gain.connect(panner)
      panner.connect(fx)
    } else {
      osc.connect(gain)
      gain.connect(fx)
    }

    osc.start(now)
    osc.stop(now + ms / 1000 + 0.03)
  }

  function noiseTick({ g = 0.03, ms = 36, pan = 0 }) {
    const ctx = ctxRef.current
    const fx = fxRef.current
    const buf = noiseRef.current
    if (!ctx || !fx || !buf) return

    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1200
    hp.Q.value = 0.8
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    const now = ctx.currentTime

    const amp = clamp(g, 0, 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(amp, now + 0.004)
    expRamp(gain.gain, now + 0.004, amp, now + ms / 1000, 0.0001)

    src.connect(hp)
    hp.connect(gain)
    if (panner) {
      panner.pan.value = clamp(pan, -1, 1)
      gain.connect(panner)
      panner.connect(fx)
    } else {
      gain.connect(fx)
    }

    src.start(now)
    src.stop(now + ms / 1000 + 0.03)
  }

  function click() {
    ping({ f: 860, to: 520, type: 'triangle', g: 0.055, ms: 52, pan: (Math.random() * 2 - 1) * 0.15 })
    noiseTick({ g: 0.02, ms: 28, pan: (Math.random() * 2 - 1) * 0.25 })
  }

  function hover() {
    ping({ f: 520, to: 600, type: 'sine', g: 0.018, ms: 60, pan: (Math.random() * 2 - 1) * 0.22 })
  }

  function scroll() {
    noiseTick({ g: 0.016, ms: 26, pan: (Math.random() * 2 - 1) * 0.12 })
  }

  function success() {
    ping({ f: 784, to: 988, type: 'triangle', g: 0.040, ms: 120, pan: -0.08 })
    setTimeout(() => ping({ f: 988, to: 1174, type: 'sine', g: 0.032, ms: 140, pan: 0.08 }), 90)
    setTimeout(() => ping({ f: 1174, to: 1568, type: 'triangle', g: 0.028, ms: 160, pan: 0.0 }), 170)
    setTimeout(() => noiseTick({ g: 0.018, ms: 60, pan: 0.0 }), 210)
  }

  useEffect(() => {
    function boot() {
      ensure()
    }

    function onClick(e) {
      if (!ensure()) return
      const t = e.target
      if (!t) return
      if (t.closest && t.closest('button, a, .chip, .playChip, .caseBtn, .serverButton, .serverItem')) click()
    }

    function onHover(e) {
      if (!startedRef.current) return
      const now = Date.now()
      if (now - lastHoverRef.current < 110) return
      const t = e.target
      if (!t) return
      if (t.closest && t.closest('button, a, .chip, .playChip, .caseCard, .serverButton, .serverItem')) {
        lastHoverRef.current = now
        hover()
      }
    }

    function onWheel() {
      if (!startedRef.current) {
        boot()
        return
      }
      const now = Date.now()
      if (now - lastScrollRef.current < 160) return
      lastScrollRef.current = now
      scroll()
    }

    window.addEventListener('pointerdown', boot, { passive: true })
    window.addEventListener('keydown', boot)
    window.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('click', onClick, true)
    document.addEventListener('mouseover', onHover, true)

    window.NelonDLC_SFX = { click, hover, scroll, success, ensure: boot }

    return () => {
      window.removeEventListener('pointerdown', boot)
      window.removeEventListener('keydown', boot)
      window.removeEventListener('wheel', onWheel)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('mouseover', onHover, true)
      try {
        delete window.NelonDLC_SFX
      } catch {
        // ignore
      }
    }
  }, [])

  return null
}
