"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"

import { supabase } from "./supabaseClient"

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncSession = async () => {
    setLoading(true)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw sessionError
      }
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "세션 정보를 불러오지 못했습니다."
      setError(message)
      setSession(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const init = async () => {
      await syncSession()
    }
    void init()

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      // Treat token refresh as a no-op to avoid UI flicker.
      if (event === "TOKEN_REFRESHED") {
        setSession((prev) => nextSession ?? prev)
        setUser((prev) => nextSession?.user ?? prev ?? null)
        return
      }
      setSession(nextSession ?? null)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      error,
      refreshSession: syncSession,
    }),
    [error, loading, session, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
