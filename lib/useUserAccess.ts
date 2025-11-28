"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { mockApi, mockApiAvailable, type ReportRow, type UserRecord } from "./mockApi"

export function useUserAccess(userId = 1) {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [pendingReports, setPendingReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!mockApiAvailable) {
      setUser(null)
      setPendingReports([])
      setError("모의 API가 설정되지 않았습니다. NEXT_PUBLIC_MOCK_API를 설정하거나 백엔드를 연결하세요.")
      setLoading(false)
      return
    }
    setLoading(true)
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
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const isLocked = useMemo(() => {
    if (!user) return false
    return user.accountState === "locked" || pendingReports.length > 0
  }, [pendingReports.length, user])

  const isAuthenticated = Boolean(user)

  const lockReason = user?.lockReason ?? (pendingReports.length > 0 ? "신고 접수로 검토 중입니다." : null)

  return {
    user,
    pendingReports,
    loading,
    error,
    isLocked,
    isAuthenticated,
    lockReason,
    refresh: fetchData,
  }
}
