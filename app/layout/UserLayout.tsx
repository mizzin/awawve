"use client"
console.log("🔄 UserLayout mounted");


import Link from "next/link"
import { usePathname } from "next/navigation"
import type { MouseEvent, ReactNode } from "react"
import { Bell, Home, PlusCircle, UserRound } from "lucide-react"
import Image from "next/image"

import { useUserAccess } from "@/lib/useUserAccess"

type UserLayoutProps = {
  children: ReactNode
  isLoggedIn?: boolean
  onRequireAuth?: () => void
  userId?: number
}

const navItems = [
  {
    href: "/feed",
    label: "홈",
    icon: Home,
    match: (path: string) => path === "/feed" || /^\/feed\/(?!new).*/.test(path),
  },
  { href: "/feed/new", label: "글쓰기", icon: PlusCircle, match: (path: string) => path === "/feed/new" },
  { href: "/profile/me", label: "프로필", icon: UserRound, match: (path: string) => path.startsWith("/profile") },
]

export default function UserLayout({ children, isLoggedIn = true, onRequireAuth, userId = 1 }: UserLayoutProps) {
  const pathname = usePathname()
  const { isLocked, lockReason } = useUserAccess(userId)
  const effectiveLoggedIn = isLoggedIn && !isLocked

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isLocked) {
      event.preventDefault()
      alert(lockReason ?? "신고 처리 중이라 이용이 제한됩니다.")
      return
    }

    const requiresAuth = href === "/feed/new" || href.startsWith("/profile")
    if (!effectiveLoggedIn && requiresAuth) {
      event.preventDefault()
      onRequireAuth?.()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--awave-bg)] text-[var(--awave-text)]">
      <header className="flex flex-col border-b border-[var(--awave-border)] bg-[var(--awave-bg)] px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-baseline transition hover:text-[var(--awave-button)]">
            <Image src="/logo.png" alt="awave" width={96} height={32} className="h-7 w-auto" priority />
            <span className="text-sm text-[var(--awave-text-light)]">@beta</span>
          </Link>
          <button
            type="button"
            aria-label="알림"
            className="inline-flex items-center justify-center rounded-full p-1 text-[var(--awave-text-light)] transition hover:text-[var(--awave-text)]"
          >
            <Bell className="size-5" />
          </button>
        </div>

        {isLocked && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            신고 접수 상태예요. 로그인/로그아웃 외에는 이용이 제한됩니다.{" "}
            {lockReason ? `(${lockReason})` : "운영자가 검토 중입니다."}
          </div>
        )}
      </header>

      <main className="pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--awave-border)] bg-white/95 px-6 py-2 text-sm text-[var(--awave-text-light)] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                className={`flex flex-col items-center transition ${
                  isActive ? "text-[var(--awave-button)]" : "text-[var(--awave-text-light)]"
                }`}
              >
                <Icon size={item.href === "/feed/new" ? 28 : 22} strokeWidth={1.8} />
                <span className="mt-1 text-xs">{item.label}</span>
              </Link>
            )
          })}
          {/* 탐색 버튼은 베타 버전에서 숨김 처리 */}
        </div>
      </nav>
    </div>
  )
}
