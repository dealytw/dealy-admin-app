'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { strapiClient } from '../data/strapiClient'

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
    // Check for existing JWT on mount (client-side only)
    if (typeof window !== 'undefined') {
      const existingJwt = strapiClient.getJWT()
      if (existingJwt) {
        setJwt(existingJwt)
        // In a real app, you might want to verify the JWT is still valid
        // by making a request to Strapi's /api/users/me endpoint
      }
    }
  }, [])

  const login = async (identifier: string, password: string) => {
    const response = await strapiClient.login(identifier, password)
    setJwt(response.jwt)
    setUser(response.user)
  }

  const logout = () => {
    strapiClient.logout()
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