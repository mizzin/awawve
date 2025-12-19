"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import UserLayout from "@/app/layout/UserLayout"
import FeedCard, { type FeedCardData, type ReactionKey } from "@/app/feed/components/FeedCard"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { buildReactionMessage, createOrUpdateNotification, deleteReactionNotification } from "@/lib/notifications"

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
  place_id: string | null
  place_name: string | null
  category: string | null
  created_at: string
  nickname?: string | null
  users?:
    | { id: string; nickname: string | null; profile_image: string | null }
    | { id: string; nickname: string | null; profile_image: string | null }[]
    | null
  author_nickname?: string
  author_profile_image?: string | null
  feed_comments?: { id: string }[] | null
  feed_reactions?: { reaction_type: string }[] | null
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

      const { data, error } = await supabase
        .from("feeds")
        .select(
          `
          id,
          user_id,
          content,
          image_url,
          place_id,
          place_name,
          category,
          created_at,
          users:users!feeds_user_id_fkey(id, nickname, profile_image),
          feed_comments:feed_comments(id),
          feed_reactions:feed_reactions(reaction_type)
        `
        )
        .order("created_at", { ascending: false })

      if (error) {
        console.error("feed list fetch error:", error)
        setFeeds([])
        setFeedsLoading(false)
        return
      }

      const mapped = (data || []).map<FeedCardData>((item) => {
        const joinedUser = Array.isArray(item.users) ? item.users[0] : item.users
        const reactions = item.feed_reactions || []
        const maskUserId = (userId: string | null) => (userId ? `익명-${userId.slice(0, 4)}` : "익명")
        const nickname = joinedUser?.nickname?.trim() || maskUserId(item.user_id)

        return {
          id: `${item.id}`,
          author: {
            id: joinedUser?.id,
            nickname,
            avatarUrl: joinedUser?.profile_image ?? null,
          },
          content: item.content,
          imageUrl: item.image_url,
          placeId: item.place_id,
          placeName: item.place_name,
          category: item.category,
          createdAt: item.created_at,
          commentCount: item.feed_comments?.length ?? 0,
          reactions: {
            like: reactions.filter((r) => r.reaction_type === "like").length,
            funny: reactions.filter((r) => r.reaction_type === "meh" || r.reaction_type === "funny").length,
            dislike: reactions.filter((r) => r.reaction_type === "dislike").length,
          },
        }
      })

      setFeeds(mapped)
      setFeedsLoading(false)
    }

    void fetchFeeds()
  }, [profileName, sessionUser?.email, sessionUser?.id])

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

  const normalizeReactionKey = useCallback((key: ReactionKey | "meh"): ReactionKey => {
    if (key === "meh") return "funny"
    return key
  }, [])

  const handleReactionChange = useCallback(
    async (feedId: string, next: ReactionKey | null, _prev: ReactionKey | null) => {
      if (!sessionUser?.id) {
        showAuthToast()
        return false
      }

      const userId = sessionUser.id
      const targetFeed = feeds.find((feed) => feed.id === feedId)
      const targetUserId = targetFeed?.author.id ?? null

      const { data: existingRow, error: fetchError } = await supabase
        .from("feed_reactions")
        .select("id, reaction_type")
        .eq("feed_id", feedId)
        .eq("user_id", userId)
        .maybeSingle<{ id: string; reaction_type: ReactionKey | "meh" }>()

      if (fetchError) {
        console.error("[feed reactions] fetch existing error", fetchError)
        toast({
          title: "반응 처리 중 문제가 발생했어요.",
          duration: 2000,
          className:
            "rounded-xl border border-[var(--awave-border)] bg-white text-[var(--awave-text)] shadow-md",
        })
        return false
      }

      const existingType = existingRow ? normalizeReactionKey(existingRow.reaction_type) : null

      try {
        if (!existingRow && next) {
          const { error } = await supabase.from("feed_reactions").insert({
            feed_id: feedId,
            user_id: userId,
            reaction_type: next,
          })
          if (error) throw error
        } else if (existingRow && existingType === next) {
          const { error } = await supabase.from("feed_reactions").delete().eq("id", existingRow.id)
          if (error) throw error
        } else if (existingRow && next) {
          const { error } = await supabase
            .from("feed_reactions")
            .update({ reaction_type: next, updated_at: new Date().toISOString() })
            .eq("id", existingRow.id)

          if (error) throw error
        } else if (!existingRow && !next) {
          return true
        }
      } catch (error) {
        console.error("[feed reactions] mutation error", error)
        toast({
          title: "반응 처리 중 문제가 발생했어요.",
          duration: 2000,
          className:
            "rounded-xl border border-[var(--awave-border)] bg-white text-[var(--awave-text)] shadow-md",
        })
        return false
      }

      try {
        if (targetUserId) {
          if (!next || (existingRow && existingType === next)) {
            await deleteReactionNotification({
              userId: targetUserId,
              fromUserId: userId,
              referenceId: feedId,
            })
          } else {
            await createOrUpdateNotification({
              userId: targetUserId,
              fromUserId: userId,
              type: "reaction",
              referenceId: feedId,
              message: buildReactionMessage(next),
            })
          }
        }
      } catch (notificationError) {
        console.error("[feed reactions] notification error", notificationError)
      }

      const decrementKey = existingType
      const incrementKey = existingType === next ? null : next

      setFeeds((prevFeeds) =>
        prevFeeds.map((feed) => {
          if (feed.id !== feedId) return feed
          const base = feed.reactions ?? { like: 0, funny: 0, dislike: 0 }
          const updated = { ...base }

          if (decrementKey) {
            updated[decrementKey] = Math.max(0, (updated[decrementKey] ?? 0) - 1)
          }
          if (incrementKey) {
            updated[incrementKey] = (updated[incrementKey] ?? 0) + 1
          }

          return { ...feed, reactions: updated }
        })
      )

      return true
    },
    [sessionUser?.id, showAuthToast, toast, normalizeReactionKey, feeds]
  )

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
                onReactionChange={handleReactionChange}
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
