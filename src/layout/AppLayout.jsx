import { Outlet } from 'react-router-dom'
import SiteHeader from './SiteHeader.jsx'
import BackgroundLayer from '../components/BackgroundLayer.jsx'
import Snowfall from '../components/Snowfall.jsx'
import LoaderOverlay from '../components/LoaderOverlay.jsx'
import SoundManager from '../components/SoundManager.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export default function AppLayout() {
  const { ready } = useAuth()

  return (
    <div className="app appEnter">
      <BackgroundLayer />
      <Snowfall />
      <SoundManager />
      <LoaderOverlay show={!ready} />
      <div className="appShell">
        <SiteHeader />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
