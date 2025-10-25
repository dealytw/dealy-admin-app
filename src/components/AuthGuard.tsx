
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  console.log('AuthGuard: Checking authentication', { isAuthenticated, isLoading });

  useEffect(() => {
    // Only redirect if we're not loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      console.log('AuthGuard: Not authenticated, redirecting to login');
      navigate('/login', { replace: true, state: { from: location } })
    }
  }, [isAuthenticated, isLoading, navigate, location])

  // Show nothing while loading
  if (isLoading) {
    return null
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
