import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function PricingPage() {
  const { user } = useAuth()
  const plans = useMemo(
    () => [
      {
        tier: 'Basic',
        duration: '30 дней',
        price: '78₽',
        period: '/ месяц',
        tagline: 'Идеально для начала',
        perks: ['Доступ к загрузкам', 'Доступ к форуму', 'Стандартная поддержка', 'Обновления контента'],
        icon: '🚀',
      },
      {
        tier: 'Plus',
        duration: '90 дней',
        price: '135₽',
        period: '/ 3 месяца',
        tagline: 'Больше времени, лучшая цена',
        perks: ['Доступ к загрузкам', 'Доступ к форуму', 'Приоритетная поддержка', 'Ранний доступ к новинкам', 'Эксклюзивный контент'],
        accent: true,
        icon: '⭐',
        badge: 'Популярный',
      },
      {
        tier: 'Lifetime',
        duration: 'навсегда',
        price: '198₽',
        period: '/ навсегда',
        tagline: 'Один раз и навсегда',
        perks: ['Пожизненный доступ', 'Доступ к форуму', 'VIP поддержка', 'Все будущие обновления', 'Эксклюзивный контент', 'Особый статус'],
        icon: '👑',
      },
    ],
    []
  )

  return (
    <div className="page">
      <div className="panel panelDeep pricingEnter">
        <div className="pricingHead">
          <div>
            <div className="panelTitle">Выберите свой тариф</div>
            <div className="panelText">Получите доступ ко всем возможностям NelonDLC</div>
          </div>
          {user ? (
            <Link className="btn btnPrimary" to={`/user/${user.uid}`}>
              Личный кабинет
            </Link>
          ) : (
            <Link className="btn btnPrimary" to="/login">
              Войти
            </Link>
          )}
        </div>

        <div className="pricingGrid">
          {plans.map((p) => (
            <div key={p.tier} className={`pricingCard ${p.accent ? 'pricingCardAccent' : ''}`}>
              {p.badge && <div className="pricingBadge">{p.badge}</div>}
              
              <div className="pricingTop">
                <div className="pricingIcon">{p.icon}</div>
                <div className="pricingTier">{p.tier}</div>
                <div className="pricingDuration">({p.duration})</div>
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
                <a 
                  href="https://funpay.com/users/12823655/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="funpayLink"
                >
                  <div className="funpayIcon">F</div>
                  <span>Купить на FunPay</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {user ? (
          <div className="panelText" style={{ marginTop: 20, textAlign: 'center', fontSize: '14px' }}>
            Ваш UID: <span className="uid" style={{ fontSize: '16px', fontWeight: '700' }}>{user.uid}</span>
          </div>
        ) : (
          <div className="panelText" style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/register" style={{ color: 'rgba(168, 120, 255, 0.95)', textDecoration: 'none' }}>
              Зарегистрируйтесь
            </Link>
            {' '}чтобы получить свой UID
          </div>
        )}
      </div>
    </div>
  )
}
