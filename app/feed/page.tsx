"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const TOAST_MESSAGES = ["로그인 후 파도에 함께 타보세요 🌊", "회원가입 후 좀 더 즐겨보세요 🌊"] as const

const FEEDS: FeedCardData[] = []

export default function FeedPage() {
  const router = useRouter()
  const { toast } = useToast()

  // TODO: Replace with Supabase auth once wired.
  const isLoggedIn = false

  useEffect(() => {
    router.prefetch("/login")
  }, [router])

  const showAuthToast = useCallback(() => {
    const message = TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)]
    toast({
      title: message,
      duration: 3000,
      className: "cursor-pointer rounded-xl border border-zinc-100 bg-white pr-12 text-gray-700 shadow-md",
      action: (
        <ToastAction
          altText="로그인하기"
          onClick={() => router.push("/login")}
          className="h-auto p-0 text-[#3182F6] font-semibold hover:underline"
        >
          로그인하기
        </ToastAction>
      ),
    })
  }, [router, toast])

  const handleWriteClick = useCallback(() => {
    if (!isLoggedIn) {
      showAuthToast()
      return
    }
    router.push("/feed/new")
  }, [isLoggedIn, router, showAuthToast])

  const gatedButtonClass = cn(!isLoggedIn && "cursor-not-allowed")

  const hasFeeds = FEEDS.length > 0

  return (
    <UserLayout isLoggedIn={isLoggedIn} onRequireAuth={showAuthToast}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 ">
        <header className="flex items-start justify-between">
       
        </header>

        {!isLoggedIn && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
            비로그인 사용자는 읽기 전용 모드로 제공돼요.
          </div>
        )}

        <section className="flex flex-col gap-6">
          {hasFeeds ? (
            FEEDS.map((feed) => (
              <FeedCard key={feed.id} feed={feed} readOnly={!isLoggedIn} onRequireAuth={showAuthToast} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
              <p className="font-semibold text-zinc-700">존재하는 피드가 없습니다.</p>
              <p className="mt-1 text-zinc-500">당신의 첫 피드로 파도를 채워주세요 🌊</p>
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  )
}
