"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Activity, AlertTriangle, BarChart2, Home, Settings, ShieldCheck, Users } from "lucide-react"

type AdminLayoutProps = {
  children: ReactNode
}

const adminBasePath = "/catAridogJJa-admin"

const navItems = [
  { href: adminBasePath, label: "관리자 메인", icon: Home },
  { href: `${adminBasePath}/users`, label: "사용자 관리", icon: Users },
  { href: `${adminBasePath}/feed`, label: "피드 관리", icon: BarChart2 },
  { href: `${adminBasePath}/report`, label: "신고 센터", icon: AlertTriangle },
  { href: `${adminBasePath}/system`, label: "시스템 모니터링", icon: Settings },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-[var(--awave-bg)] text-[var(--awave-text)]">
      <aside className="hidden w-64 flex-col border-r border-[var(--awave-border)] bg-white px-5 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--awave-secondary)] text-[var(--awave-button)] font-bold">
            A
          </div>
          <div>
            <p className="text-sm text-[var(--awave-text-light)]">AWAVE</p>
            <p className="text-lg font-semibold">Admin</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--awave-secondary)] text-[var(--awave-button)]"
                    : "text-[var(--awave-text)] hover:bg-[var(--awave-secondary)]"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-3 text-xs text-[var(--awave-text-light)]">
          <p className="flex items-center gap-2 text-[var(--awave-text)]">
            <ShieldCheck className="size-4 text-[var(--awave-button)]" />
            보안 알림
          </p>
          <p className="mt-1">정기 점검이 예정되어 있습니다.</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--awave-border)] bg-white px-4 py-3">
          <div>
            <p className="text-xs text-[var(--awave-text-light)]">AWAVE 관리자</p>
            <p className="text-lg font-semibold text-[var(--awave-text)]">
              {navItems.find((item) => item.href === pathname)?.label ?? "대시보드"}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[var(--awave-secondary)] px-3 py-1 text-xs text-[var(--awave-text-light)]">
            <div className="size-2 rounded-full bg-emerald-500" />
            운영 상태 정상
          </div>
        </header>

        <nav className="flex items-center gap-2 overflow-x-auto border-b border-[var(--awave-border)] bg-white px-4 py-2 text-sm text-[var(--awave-text-light)] md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                  isActive
                    ? "bg-[var(--awave-secondary)] text-[var(--awave-button)]"
                    : "text-[var(--awave-text)]"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <main className="flex-1 bg-[var(--awave-secondary)]/60 px-4 py-6">{children}</main>
      </div>
    </div>
  )
}
