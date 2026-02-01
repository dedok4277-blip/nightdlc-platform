import { useEffect, useState } from 'react'
import ShatterTitle from './ShatterTitle.jsx'

export default function LoaderOverlay({ show }) {
  const [visible, setVisible] = useState(!!show)
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      setHiding(false)
      return
    }

    if (!visible) return
    setHiding(true)
    const t = setTimeout(() => {
      setVisible(false)
      setHiding(false)
    }, 360)
    return () => clearTimeout(t)
  }, [show, visible])

  if (!visible) return null

  return (
    <div className={`loaderOverlay${hiding ? ' loaderOverlayHide' : ''}`} aria-hidden="true">
      <div className={`loaderCard${hiding ? ' loaderCardHide' : ''}`}>
        <div className="loaderTitle">
          <ShatterTitle text="NelonDLC" />
        </div>
        <div className="loaderBar">
          <span className="loaderBarFill" />
        </div>
      </div>
    </div>
  )
}
