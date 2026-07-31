import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppShell } from '@/layouts/app-shell'
import { DashboardPage } from '@/pages/dashboard-page'
import { ExpensesPage } from '@/pages/expenses-page'
import { GroupsPage } from '@/pages/groups-page'
import { LoginPage } from '@/pages/login-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { SettlementsPage } from '@/pages/settlements-page'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
