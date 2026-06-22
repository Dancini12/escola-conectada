import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (adminOnly && profile?.perfil === 'aluno') {
    return <Navigate to="/agendamentos" replace />
  }

  return children
}
