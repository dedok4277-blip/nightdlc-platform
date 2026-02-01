import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter.jsx'
import { AuthProvider } from './state/AuthContext.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
