
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  console.log('AuthGuard: Checking authentication', { isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('AuthGuard: Not authenticated, redirecting to login');
      navigate('/login', { replace: true, state: { from: location } })
    }
  }, [isAuthenticated, navigate, location])

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
