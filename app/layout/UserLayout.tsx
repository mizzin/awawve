"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { MouseEvent, ReactNode } from "react"
import { Bell, Home, PlusCircle, UserRound } from "lucide-react"

type UserLayoutProps = {
  children: ReactNode
  isLoggedIn?: boolean
  onRequireAuth?: () => void
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

export default function UserLayout({ children, isLoggedIn = true, onRequireAuth }: UserLayoutProps) {
  const pathname = usePathname()

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const requiresAuth = href === "/feed/new" || href.startsWith("/profile")
    if (!isLoggedIn && requiresAuth) {
      event.preventDefault()
      onRequireAuth?.()
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#333]">
      <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
        <div className="flex items-baseline">
          <span className="text-lg font-semibold text-zinc-900">AWAVE</span>
          <span className="ml-1 text-sm text-zinc-400">@beta</span>
        </div>
        <button
          type="button"
          aria-label="알림"
          className="inline-flex items-center justify-center rounded-full p-1 text-zinc-400 transition hover:text-zinc-600"
        >
          <Bell className="size-5" />
        </button>
      </header>

      <main className="pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-100 bg-white/95 px-6 py-2 text-sm text-gray-500 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                className={`flex flex-col items-center transition ${isActive ? "text-[#3182F6]" : "text-gray-500"}`}
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
