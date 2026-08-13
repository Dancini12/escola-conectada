import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { AgendamentosProvider } from './hooks/useAgendamentos'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Agendamentos from './pages/Agendamentos'
import MeusAgendamentos from './pages/MeusAgendamentos'
import Reservar from './pages/Reservar'
import Cancelar from './pages/Cancelar'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/cancelar" element={<Cancelar />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route index element={<Navigate to="/reservar" replace />} />
                <Route path="reservar" element={<Reservar />} />
                <Route path="agendamentos" element={<Agendamentos />} />
                <Route path="meus-agendamentos" element={<MeusAgendamentos />} />
                <Route path="*" element={<Navigate to="/reservar" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AgendamentosProvider>
          <AppRoutes />
        </AgendamentosProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
