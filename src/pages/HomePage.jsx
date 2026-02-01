import CaseGrid from '../components/CaseGrid.jsx'
import ShatterTitle from '../components/ShatterTitle.jsx'
import Reveal from '../components/Reveal.jsx'

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="heroTitle heroTitleSolo">
          <ShatterTitle text="NelonDLC" />
        </div>
      </section>

      <Reveal>
        <CaseGrid />
      </Reveal>
    </div>
  )
}
