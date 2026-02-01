import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layout/AppLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import ForumPage from '../pages/ForumPage.jsx'
import PricingPage from '../pages/PricingPage.jsx'
import AdminPanelPage from '../pages/AdminPanelPage.jsx'
import UserPanelPage from '../pages/UserPanelPage.jsx'
import { RequireAdmin, RequireAuth } from './Guards.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminPanelPage />
            </RequireAdmin>
          }
        />
        <Route
          path="user/:uid"
          element={
            <RequireAuth>
              <UserPanelPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
