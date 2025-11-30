"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "./supabaseClient"
import { mockApi, mockApiAvailable, type ReportRow, type UserRecord } from "./mockApi"

export function useUserAccess(userId = 1, requiredLevel?: number) {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [pendingReports, setPendingReports] = useState<ReportRow[]>([])
  const [mockLoading, setMockLoading] = useState(true)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMockData = useCallback(async () => {
    if (!mockApiAvailable) {
      setUser(null)
      setPendingReports([])
      setError(null)
      setMockLoading(false)
      return
    }
    setMockLoading(true)
    try {
      const [userData, pending] = await Promise.all([
        mockApi.getUser(userId),
        mockApi.getPendingReportsByUser(userId),
      ])
      setUser(userData)
      setPendingReports(pending)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "사용자 정보를 불러오지 못했어요."
      setError(message)
      setUser(null)
      setPendingReports([])
    } finally {
      setMockLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchMockData()
  }, [fetchMockData])

  useEffect(() => {
    const syncAuth = async () => {
      try {
        const userRes = await supabase.auth.getUser()
        if (userRes.data.user) {
          setAuthUser(userRes.data.user)
          setAuthLoading(false)
          return
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setAuthUser(null)
        } else {
          setAuthUser(data.session?.user ?? null)
        }
      } catch {
        setAuthUser(null)
      } finally {
        setAuthLoading(false)
      }
    }
    void syncAuth()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  const meetsLevel = useMemo(() => {
    if (requiredLevel === undefined || requiredLevel === null) return true
    if (typeof user?.level !== "number") return false
    return user.level >= requiredLevel
  }, [requiredLevel, user?.level])

  const isLocked = useMemo(() => {
    if (!user) return false
    return user.accountState === "locked" || pendingReports.length > 0
  }, [pendingReports.length, user])

  const isAuthenticated = Boolean(authUser) && meetsLevel
  const loading = authLoading || mockLoading

  const lockReason = user?.lockReason ?? (pendingReports.length > 0 ? "신고 접수로 검토 중입니다." : null)

  return {
    user,
    authUser,
    pendingReports,
    loading,
    error,
    isLocked,
    isAuthenticated,
    lockReason,
    refresh: fetchMockData,
  }
}
