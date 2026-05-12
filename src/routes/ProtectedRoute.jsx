import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { session } = useAuth()

  // Se não tiver sessão (login), redireciona para a página de login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Se tiver, deixa a rota renderizar normalmente
  return <Outlet />
}