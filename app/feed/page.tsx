"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const TOAST_MESSAGES = ["로그인 후 파도에 함께 타보세요 🌊", "회원가입 후 좀 더 즐겨보세요 🌊"] as const

const DUMMY_FEEDS: FeedCardData[] = [
  {
    id: 101,
    author: {
      nickname: "bgc_life",
      handle: "@bgc_life",
      avatarUrl: "https://i.pravatar.cc/120?img=32",
    },
    content: "금요일 퇴근길에 본 한강 노을, 물결 위에 분홍빛이 퍼지는 순간을 담아봤어요.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    createdAt: "2025-02-15T10:00:00Z",
    reactions: {
      like: 15,
      funny: 2,
      dislike: 0,
    },
    commentCount: 8,
  },
  {
    id: 102,
    author: {
      nickname: "saltbread",
      handle: "@saltbread",
      avatarUrl: "https://i.pravatar.cc/120?img=12",
    },
    content:
      "부산에서 먹은 생멸치 회. 식감이 살짝 생소했지만 고소하고 담백해서 폭풍 흡입했어요. 바다 냄새가 그대로 느껴지는 맛!",
    imageUrl: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=600&q=80",
    createdAt: "2025-02-14T12:30:00Z",
    reactions: {
      like: 32,
      funny: 6,
      dislike: 1,
    },
    commentCount: 12,
  },
  {
    id: 103,
    author: {
      nickname: "weekendtrip",
      handle: "@weekendtrip",
      avatarUrl: "https://i.pravatar.cc/120?img=5",
    },
    content:
      "도쿄 근교 하이킹 코스 추천 받을 수 있을까요? 이번 주말에 잠깐 다녀오려고요. 산책하기 좋은 루트 알려주세요!",
    imageUrl: null,
    createdAt: "2025-02-13T09:12:00Z",
    reactions: {
      like: 7,
      funny: 1,
      dislike: 0,
    },
    commentCount: 3,
  },
]

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
      className: "cursor-pointer rounded-xl border border-zinc-100 bg-white text-gray-700 shadow-md",
      onClick: () => router.push("/login"),
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

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 ">
        <header className="flex items-start justify-between">
       
        </header>

        {!isLoggedIn && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
            비로그인 사용자는 읽기 전용 모드로 제공돼요.
          </div>
        )}

        <section className="flex flex-col gap-6">
          {DUMMY_FEEDS.map((feed) => (
            <FeedCard key={feed.id} feed={feed} readOnly={!isLoggedIn} onRequireAuth={showAuthToast} />
          ))}
        </section>
      </div>
    </UserLayout>
  )
}
