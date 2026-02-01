export default function BackgroundLayer() {
  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="bgNoise" />
        <div className="bgGlow bgGlowA" />
        <div className="bgGlow bgGlowB" />
        <div className="bgWords" />
      </div>
    </>
  )
}
