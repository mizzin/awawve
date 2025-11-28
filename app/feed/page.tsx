"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"

import UserLayout from "@/app/layout/UserLayout"
import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useUserAccess } from "@/lib/useUserAccess"

const TOAST_MESSAGES = ["로그인 후 파도에 함께 타보세요 🌊", "회원가입 후 좀 더 즐겨보세요 🌊"] as const

const FEEDS: FeedCardData[] = []

export default function FeedPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isLocked, isAuthenticated, lockReason } = useUserAccess(1)

  // TODO: Replace with Supabase auth once wired.
  const isLoggedIn = isAuthenticated && !isLocked

  useEffect(() => {
    router.prefetch("/login")
  }, [router])

  const showAuthToast = useCallback(() => {
    const message = TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)]
    toast({
      title: message,
      duration: 3000,
      className:
        "cursor-pointer rounded-xl border border-[var(--awave-border)] bg-white pr-12 text-[var(--awave-text)] shadow-md",
      action: (
        <ToastAction
          altText="로그인하기"
          onClick={() => router.push("/login")}
          className="h-auto border-none bg-transparent p-0 text-[var(--awave-button)] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-0"
        >
          로그인하기
        </ToastAction>
      ),
    })
  }, [router, toast])

  const showLockedToast = useCallback(() => {
    toast({
      title: lockReason ?? "신고 확인 중이라 글쓰기가 제한됩니다.",
      duration: 3000,
      className:
        "cursor-pointer rounded-xl border border-[var(--awave-border)] bg-white pr-12 text-[var(--awave-text)] shadow-md",
      description: "운영자 확인 전까지 로그인/로그아웃만 가능합니다.",
    })
  }, [lockReason, toast])

  const handleWriteClick = useCallback(() => {
    if (isLocked) {
      showLockedToast()
      return
    }

    if (!isLoggedIn) {
      showAuthToast()
      return
    }
    router.push("/feed/new")
  }, [isLocked, isLoggedIn, router, showAuthToast, showLockedToast])

  const gatedButtonClass = cn((!isLoggedIn || isLocked) && "cursor-not-allowed")

  const hasFeeds = FEEDS.length > 0

  return (
    <UserLayout isLoggedIn={isLoggedIn} onRequireAuth={isLocked ? showLockedToast : showAuthToast}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 ">
        <header className="flex items-start justify-between">
       
        </header>

        {isLocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            신고 접수 상태입니다. 로그인/로그아웃 외 기능은 차단됩니다.
          </div>
        )}

        {!isLoggedIn && !isLocked && (
          <div className="rounded-xl bg-[var(--awave-secondary)] px-4 py-3 text-xs text-[var(--awave-text-light)]">
            비로그인 사용자는 읽기 전용 모드로 제공돼요.
          </div>
        )}

        <section className="flex flex-col gap-6">
          {hasFeeds ? (
            FEEDS.map((feed) => (
              <FeedCard
                key={feed.id}
                feed={feed}
                readOnly={!isLoggedIn}
                onRequireAuth={isLocked ? showLockedToast : showAuthToast}
              />
            ))
          ) : (
            <div className="rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-10 text-center text-sm text-[var(--awave-text-light)]">
              <p className="font-semibold text-[var(--awave-text)]">존재하는 피드가 없습니다.</p>
              <p className="mt-1 text-[var(--awave-text-light)]">당신의 첫 피드로 파도를 채워주세요 🌊</p>
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  )
}
