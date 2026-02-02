import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function PricingPage() {
  const { user } = useAuth()
  const plans = useMemo(
    () => [
      {
        tier: 'Basic',
        price: '78₽',
        period: '/ month',
        tagline: 'Starter access to NelonDLC downloads.',
        perks: ['Access to downloads', 'Forum access', 'Standard support'],
      },
      {
        tier: 'Plus',
        price: '135₽',
        period: '/ 3 months',
        tagline: 'More time, better value.',
        perks: ['Access to downloads', 'Forum access', 'Priority support'],
        accent: true,
      },
      {
        tier: 'Elite',
        price: '198₽',
        period: '/ lifetime',
        tagline: 'One-time purchase. No renewals.',
        perks: ['Lifetime access', 'Forum access', 'Top priority support'],
      },
    ],
    []
  )

  return (
    <div className="page">
      <div className="panel panelDeep pricingEnter">
        <div className="pricingHead">
          <div>
            <div className="panelTitle">Pricing</div>
            <div className="panelText">Choose the tier you want. Subscription is granted by an admin.</div>
          </div>
          {user ? (
            <Link className="btn" to={`/user/${user.uid}`}>
              User panel
            </Link>
          ) : (
            <Link className="btn" to="/login">
              Login
            </Link>
          )}
        </div>

        <div className="pricingGrid">
          {plans.map((p) => (
            <div key={p.tier} className={`pricingCard ${p.accent ? 'pricingCardAccent' : ''}`}>
              <div className="pricingTop">
                <div className="pricingTier">{p.tier}</div>
                <div className="pricingPrice">
                  <span className="pricingNum">{p.price}</span>
                  <span className="pricingPeriod">{p.period}</span>
                </div>
                <div className="pricingTag">{p.tagline}</div>
              </div>

              <div className="pricingPerks">
                {p.perks.map((x) => (
                  <div key={x} className="pricingPerk">
                    <span className="pricingDot" />
                    <span>{x}</span>
                  </div>
                ))}
              </div>

              <div className="pricingFoot">
                <div className="mini">To activate, contact admin and provide your UID.</div>
              </div>
            </div>
          ))}
        </div>

        {user ? (
          <div className="panelText" style={{ marginTop: 12 }}>
            Your UID: <span className="uid">{user.uid}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
