"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Loader2 } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { generateAvatarSVG } from "@/lib/utils/avatar"

type NotificationItem = {
  id: string
  type: "reaction" | "comment"
  reference_id: string | null
  message: string | null
  is_read: boolean
  created_at: string
  from_user: {
    id: string
    nickname: string | null
    profile_image: string | null
  } | null
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  )

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" })
      if (response.status === 401) {
        router.replace("/login")
        return
      }
      if (!response.ok) {
        throw new Error("알림을 불러오지 못했습니다.")
      }
      const payload = (await response.json()) as { notifications: NotificationItem[] }
      setNotifications(payload.notifications ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "알림을 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleReadAll = async () => {
    if (mutating || notifications.length === 0) return
    setMutating(true)
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" })
      if (!response.ok) {
        throw new Error("읽음 처리에 실패했습니다.")
      }
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "읽음 처리에 실패했습니다.")
    } finally {
      setMutating(false)
    }
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.reference_id) return
    const feedId = notification.reference_id

    if (!notification.is_read) {
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        })
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "읽음 처리에 실패했습니다.")
      }
    }

    router.push(`/feed/${feedId}`)
  }

  const hasNotifications = notifications.length > 0

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-xl flex-col px-4">
        <section className="mb-4 mt-4 flex items-center justify-between rounded-2xl border border-[var(--awave-border)] bg-[var(--awave-secondary)]/60 px-4 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[var(--awave-text)]">알림</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--awave-button)] px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            className="text-sm font-medium text-[var(--awave-button)] hover:bg-transparent"
            onClick={handleReadAll}
            disabled={!hasNotifications || mutating}
          >
            모두 읽음
          </Button>
        </section>

        <section className="flex flex-1 flex-col gap-3 pb-24">
          {loading && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--awave-border)] bg-white px-4 py-6 text-sm text-[var(--awave-text-light)]">
              <Loader2 className="size-4 animate-spin" />
              알림을 불러오는 중입니다.
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && !hasNotifications && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-[var(--awave-border)] bg-white px-4 py-16 text-[var(--awave-text-light)]">
              <div className="flex items-center gap-2 text-base font-medium">
                <Bell className="size-5" />
                <p>아직 새로운 알림이 없습니다 🔔</p>
              </div>
            </div>
          )}

          {!loading &&
            !error &&
            notifications.map((notification) => {
              const userLabel = notification.from_user?.nickname?.trim() || "익명"
              const avatarUrl =
                notification.from_user?.profile_image ?? generateAvatarSVG(userLabel, 32)
              const message = notification.message ?? "새 알림이 도착했어요."
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                    notification.is_read
                      ? "border-[var(--awave-border)] bg-white hover:shadow-md"
                      : "border-transparent bg-[var(--awave-secondary)] hover:shadow-md"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl} alt={userLabel} className="object-cover" />
                    <AvatarFallback className="bg-[var(--awave-secondary)] text-sm font-semibold text-[var(--awave-text)]">
                      {userLabel.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="text-sm">
                      <span className="font-semibold text-[var(--awave-text)]">@{userLabel}</span>{" "}
                      <span className="text-[var(--awave-text-light)]">{message}</span>
                    </div>
                    <span className="self-end text-xs text-[var(--awave-text-light)]">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                </button>
              )
            })}
        </section>
      </div>
    </UserLayout>
  )
}
