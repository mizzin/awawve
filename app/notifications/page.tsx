"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { generateAvatarSVG } from "@/lib/utils/avatar"

type NotificationItem = {
  id: number
  type: "reaction" | "comment"
  user: string
  avatarUrl?: string
  content: string
  feedId: number
  created_at: string
  read: boolean
}

const notifications: NotificationItem[] = []

export default function NotificationsPage() {
  const hasNotifications = notifications.length > 0

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-xl flex-col">
        <section className="flex items-center justify-between border-b border-[var(--awave-border)] px-4 py-4">
          <h1 className="text-2xl font-semibold text-[var(--awave-text)]">알림</h1>
          <button
            type="button"
            className="text-sm font-medium text-[var(--awave-button)] transition hover:opacity-80"
            onClick={() => alert("모든 알림을 읽음 처리합니다.")}
            disabled={!hasNotifications}
          >
            모두 읽음
          </button>
        </section>

        <section className="flex flex-1 flex-col divide-y divide-[var(--awave-border)]">
          {!hasNotifications && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-[var(--awave-text-light)]">
              <div className="flex items-center gap-2 text-base font-medium">
                <Bell className="size-5" />
                <p>아직 새로운 알림이 없습니다 🔔</p>
              </div>
            </div>
          )}

          {hasNotifications &&
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={`/feed/${notification.feedId}`}
                className={`flex items-center gap-3 px-4 py-3 transition ${
                  notification.read ? "bg-white" : "bg-[var(--awave-secondary)]"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={notification.avatarUrl ?? generateAvatarSVG(notification.user, 32)}
                    alt={notification.user}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-[var(--awave-secondary)] text-sm font-semibold text-[var(--awave-text)]">
                    {notification.user.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="text-sm">
                    <span className="font-semibold text-[var(--awave-text)]">@{notification.user}</span>{" "}
                    <span className="text-[var(--awave-text-light)]">{notification.content}</span>
                  </div>
                  <span className="self-end text-xs text-[var(--awave-text-light)]">{notification.created_at}</span>
                </div>
              </Link>
            ))}
        </section>
      </div>
    </UserLayout>
  )
}
