"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import UserLayout from "@/app/layout/UserLayout"
import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"

const TOAST_MESSAGES = ["로그인 후 파도에 함께 타보세요 🌊", "회원가입 후 좀 더 즐겨보세요 🌊"] as const

const PROFILE_TABLE = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_TABLE ?? "users"

type ProfileRow = {
  nickname: string | null
  email: string | null
}

type FeedRow = {
  id: string
  user_id: string | null
  content: string
  image_url: string | null
  created_at: string
  users?:
    | { id: string; nickname: string | null; profile_image: string | null }
    | { id: string; nickname: string | null; profile_image: string | null }[]
    | null
  author_nickname?: string
  author_profile_image?: string | null
}

export default function FeedPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileFetched, setProfileFetched] = useState(false)
  const [feeds, setFeeds] = useState<FeedCardData[]>([])
  const [feedsLoading, setFeedsLoading] = useState(false)
  const lastGreetedUserIdRef = useRef<string | null>(null)
  const isLocked = false
  const lockReason = null

  useEffect(() => {
    router.prefetch("/login")
  }, [router])

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSessionUser(data.session?.user ?? null)
      setProfileFetched(false)
      setProfileName(null)
    }
    void syncSession()
    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null)
      setProfileFetched(false)
      setProfileName(null)
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionUser?.id) {
      return
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from(PROFILE_TABLE)
        .select("nickname, email")
        .eq("id", sessionUser.id)
        .maybeSingle<ProfileRow>()

      const nickname = data?.nickname ?? data?.email ?? null
      setProfileName(nickname)
      setProfileFetched(true)
    }

    void fetchProfile()
  }, [sessionUser])

  useEffect(() => {
    const fetchFeeds = async () => {
      setFeedsLoading(true)
      try {
        const response = await fetch("/api/feeds", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`피드 API 응답이 올바르지 않습니다. (${response.status})`)
        }

        const payload = (await response.json()) as { feeds?: FeedRow[] }
        const maskUserId = (userId: string | null) => (userId ? `익명-${userId.slice(0, 4)}` : "익명")
        const mapped = (payload.feeds ?? []).map<FeedCardData>((item: FeedRow, index) => {
          const joinedUser = Array.isArray(item.users) ? item.users[0] : item.users
          const nickname = item.author_nickname ?? joinedUser?.nickname ?? maskUserId(item.user_id)
          const avatar = item.author_profile_image ?? joinedUser?.profile_image ?? null
          const id = item.id ? `${item.id}` : `${index}`
          return {
            id,
            author: {
              nickname,
              handle: nickname?.startsWith("익명") ? undefined : `@${nickname}`,
              avatarUrl: avatar,
            },
            content: item.content,
            imageUrl: item.image_url,
            createdAt: item.created_at,
            commentCount: 0,
            reactions: { like: 0, funny: 0, dislike: 0 },
          }
        })

        setFeeds(mapped)
      } catch (error) {
        console.error("Failed to load feeds", error)
        setFeeds([])
      } finally {
        setFeedsLoading(false)
      }
    }

    void fetchFeeds()
  }, [])

  useEffect(() => {
    if (sessionUser?.id && profileFetched && lastGreetedUserIdRef.current !== sessionUser.id) {
      const name = profileName ? `@${profileName}` : sessionUser.email ?? "awave"
      toast({
        title: `${name}님, awave에 오신 걸 환영해요 🌊`,
        duration: 2500,
        className:
          "cursor-pointer rounded-xl border border-[var(--awave-border)] bg-white pr-12 text-[var(--awave-text)] shadow-md",
      })
      lastGreetedUserIdRef.current = sessionUser.id
    }

    if (!sessionUser) {
      lastGreetedUserIdRef.current = null
    }
  }, [profileFetched, profileName, sessionUser, toast])

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

    if (!sessionUser) {
      showAuthToast()
      return
    }
    router.push("/feed/new")
  }, [isLocked, sessionUser, router, showAuthToast, showLockedToast])

  const gatedButtonClass = cn((!sessionUser || isLocked) && "cursor-not-allowed")

  const hasFeeds = feeds.length > 0
  const isLoggedIn = Boolean(sessionUser)

  return (
    <UserLayout isLoggedIn={isLoggedIn} onRequireAuth={isLocked ? showLockedToast : showAuthToast}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-24 pt-4 sm:pt-5 md:pt-6">

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

        <section className="flex flex-col gap-4">
          {feedsLoading ? (
            <div className="rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] mt-4 px-4 py-10 text-center text-sm text-[var(--awave-text-light)]">
              <p className="font-semibold text-[var(--awave-text)]">피드를 불러오는 중입니다.</p>
              <p className="mt-1 text-[var(--awave-text-light)]">잠시만 기다려주세요.</p>
            </div>
          ) : hasFeeds ? (
            feeds.map((feed) => (
              <FeedCard
                key={feed.id}
                feed={feed}
                readOnly={!isLoggedIn}
                onRequireAuth={isLocked ? showLockedToast : showAuthToast}
              />
            ))
          ) : (
            <div className="rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] mt-4 px-4 py-10 text-center text-sm text-[var(--awave-text-light)]">
              <p className="font-semibold text-[var(--awave-text)]">존재하는 피드가 없습니다.</p>
              <p className="mt-1 text-[var(--awave-text-light)]">당신의 첫 피드로 파도를 채워주세요 🌊</p>
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  )
}
