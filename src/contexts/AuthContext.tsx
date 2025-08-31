import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { login as strapiLogin, getAuth, setAuth, logout as strapiLogout } from '../api/strapiClient'

interface User {
  id: number
  username: string
  email: string
}

interface AuthContextType {
  user: User | null
  jwt: string | null
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [jwt, setJwt] = useState<string | null>(null)

  useEffect(() => {
    // Check for existing auth on mount
    const auth = getAuth()
    if (auth) {
      setJwt(auth.jwt)
      setUser(auth.user)
    }
  }, [])

  const login = async (identifier: string, password: string) => {
    const response = await strapiLogin(identifier, password)
    setJwt(response.jwt)
    setUser(response.user)
  }

  const logout = () => {
    strapiLogout()
    setJwt(null)
    setUser(null)
  }

  const value = {
    user,
    jwt,
    login,
    logout,
    isAuthenticated: !!jwt,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}