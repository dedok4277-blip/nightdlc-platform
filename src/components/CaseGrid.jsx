import SpotlightCard from './SpotlightCard.jsx'
import { Sparkles, ShieldCheck, Zap, PackageOpen, ScrollText, Wrench } from 'lucide-react'

const CASES = [
  {
    title: 'Beautiful Visuals',
    desc: 'A refined UI and a wide set of visual features to make your game look cleaner, brighter, and more stylish. Tune the look to match your vibe.',
    icon: Sparkles,
    tag: 'Design',
  },
  {
    title: 'Deep Customization',
    desc: 'Configure almost every feature to your playstyle. Import community configs, mix presets, and get the maximum out of the client without extra hassle.',
    icon: Zap,
    tag: 'Flexible',
  },
  {
    title: 'Optimization',
    desc: 'We constantly improve performance and stability. The client is designed to feel smooth and responsive even on weaker PCs.',
    icon: ShieldCheck,
    tag: 'Stable',
  },
  {
    title: 'Frequent Updates',
    desc: 'New features, improvements, and refinements arrive regularly. We keep the client competitive across different servers and gameplay styles.',
    icon: PackageOpen,
    tag: 'Fresh',
  },
  {
    title: 'Config Sharing',
    desc: 'Save and share your configurations with others. Browse community presets and quickly switch between server-specific setups.',
    icon: ScrollText,
    tag: 'Community',
  },
  {
    title: 'Best Support',
    desc: 'Fast and competent support that understands the product. Any question, any issue — we help you solve it without wasting your time.',
    icon: Wrench,
    tag: 'Help',
  },
]

export default function CaseGrid() {
  return (
    <section className="cases">
      <div className="casesHeader">
        <h2 className="h2">Our Advantages</h2>
      </div>

      <div className="grid">
        {CASES.map((c) => {
          const Icon = c.icon
          return (
            <SpotlightCard key={c.title}>
              <div className="caseTop">
                <div className="caseIcon">
                  <Icon size={18} />
                </div>
                <div className="caseTag">{c.tag}</div>
              </div>
              <div className="caseTitle">{c.title}</div>
              <div className="caseDesc">{c.desc}</div>
              <button type="button" className="caseBtn">
                Learn more
              </button>
            </SpotlightCard>
          )
        })}
      </div>
    </section>
  )
}
