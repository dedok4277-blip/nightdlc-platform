import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, LogIn, UserPlus, MessagesSquare, Shield, User, LogOut, CreditCard } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'

function HeaderIconLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `navIcon ${isActive ? 'navIconActive' : ''}`
      }
      aria-label={label}
      title={label}
    >
      <Icon size={18} />
    </NavLink>
  )
}

export default function SiteHeader() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <header className="headerWrap">
      <div className="headerLens">
        <div className="headerInner">
          <div className="headerLeft">
            <Link to="/" className="brand" aria-label="NelonDLC">
              <span className="brandMark" />
              <span className="brandText">NelonDLC</span>
            </Link>
          </div>

          <div className="headerCenter">
            <HeaderIconLink to="/" icon={LayoutGrid} label="Home" />
            <HeaderIconLink to="/forum" icon={MessagesSquare} label="Forum" />
            <HeaderIconLink to="/pricing" icon={CreditCard} label="Pricing" />
            {user?.isAdmin ? <HeaderIconLink to="/admin" icon={Shield} label="Admin panel" /> : null}
          </div>

          <div className="headerRight">
            {user ? (
              <>
                <button
                  type="button"
                  className="chip chipGhost"
                  onClick={() => navigate(`/user/${user.uid}`)}
                  aria-label="User panel"
                  title="User panel"
                >
                  <User size={16} />
                  <span className="chipText">UID {user.uid}</span>
                </button>

                <button type="button" className="chip" onClick={logout} title="Logout" aria-label="Logout">
                  <LogOut size={16} />
                  <span className="chipText">Logout</span>
                </button>
              </>
            ) : (
              <>
                <NavLink className={({ isActive }) => `chip ${isActive ? 'chipActive' : ''}`} to="/login">
                  <LogIn size={16} />
                  <span className="chipText">Login</span>
                </NavLink>

                <NavLink
                  className={({ isActive }) => `chip chipPrimary ${isActive ? 'chipPrimaryActive' : ''}`}
                  to="/register"
                >
                  <UserPlus size={16} />
                  <span className="chipText">Register</span>
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
