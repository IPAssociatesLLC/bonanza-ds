import React, { createContext, useContext, useState, useEffect } from "react"
import { apiPost } from "@/hooks/useFetch"

export type UserRole = "admin" | "user"

export type User = {
  id: number
  username: string
  role: UserRole
  api_credit_limit: number
  credits_used: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      // TEMPORARILY DISABLED - Auth system disabled
      setIsLoading(false)
      return
      
      /*
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        // Fetch current user details from backend
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          // Token invalid or expired
          logout()
        }
      } catch (err) {
        logout()
      } finally {
        setIsLoading(false)
      }
      */
    }
    loadUser()
  }, [token])

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("token", newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
