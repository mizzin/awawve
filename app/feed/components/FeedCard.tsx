"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { easeInOut, motion, type Transition } from "framer-motion"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { generateAvatarSVG } from "@/lib/utils/avatar"

type ReactionKey = "like" | "funny" | "dislike"

const reactionMeta: Record<
  ReactionKey,
  { emoji: string; label: string; activeColor: string; idleColor: string }
> = {
  like: { emoji: "😄", label: "좋아요", activeColor: "text-[var(--awave-button)]", idleColor: "text-[var(--awave-text-light)]" },
  funny: { emoji: "🤭", label: "ㅋㅋㅋ", activeColor: "text-[var(--awave-button)]", idleColor: "text-[var(--awave-text-light)]" },
  dislike: { emoji: "😐", label: "별로야", activeColor: "text-[var(--awave-text-light)]", idleColor: "text-[var(--awave-text-light)]" },
}
const reactionOrder: ReactionKey[] = ["like", "funny", "dislike"]
const wiggleAnimation = { rotate: [0, -10, 10, -6, 6, 0] }
const wiggleTransition: Transition = { duration: 0.25, ease: easeInOut }
const AUTH_MESSAGES = ["로그인 후 이용해 주세요 🌊", "회원가입 완료하고 함께 즐겨보세요 🌊"] as const

export type FeedCardData = {
  id: number
  author: {
    nickname: string
    handle?: string
    avatarUrl?: string | null
  }
  content: string
  imageUrl?: string | null
  createdAt: string
  commentCount?: number
  reactions?: {
    like: number
    funny: number
    dislike: number
  }
}

type FeedCardProps = {
  feed: FeedCardData
  readOnly?: boolean
  onRequireAuth?: () => void
}

export default function FeedCard({ feed, readOnly = false, onRequireAuth }: FeedCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedReaction, setSelectedReaction] = useState<ReactionKey | null>(null)
  const storageKey = useMemo(() => `feed-reaction-${feed.id}`, [feed.id])

  const dateLabel = useMemo(() => {
    const date = new Date(feed.createdAt)
    const datePart = date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    const timePart = date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true })
    return `${datePart} ${timePart}`
  }, [feed.createdAt])

  useEffect(() => {
    if (typeof window === "undefined" || readOnly) return
    const stored = window.localStorage.getItem(storageKey)
    if (stored === "like" || stored === "funny" || stored === "dislike") {
      setSelectedReaction(stored)
    }
  }, [storageKey, readOnly])

  useEffect(() => {
    if (typeof window === "undefined" || readOnly) return
    if (selectedReaction) {
      window.localStorage.setItem(storageKey, selectedReaction)
    } else {
      window.localStorage.removeItem(storageKey)
    }
  }, [selectedReaction, storageKey, readOnly])

  const notifyAuthRequired = useCallback(() => {
    if (onRequireAuth) {
      onRequireAuth()
      return
    }
    const message = AUTH_MESSAGES[Math.floor(Math.random() * AUTH_MESSAGES.length)]
    toast({
      title: message,
      duration: 3000,
      className:
        "rounded-xl border border-[var(--awave-border)] bg-white pr-12 text-[var(--awave-text)] shadow-md",
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
  }, [onRequireAuth, router, toast])

  const handleCardClick = useCallback(() => {
    if (readOnly) {
      notifyAuthRequired()
      return
    }
    router.push(`/feed/${feed.id}`)
  }, [feed.id, notifyAuthRequired, readOnly, router])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        handleCardClick()
      }
    },
    [handleCardClick]
  )

  const handleReactionClick = useCallback(
    (reaction: ReactionKey) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      if (readOnly) {
        notifyAuthRequired()
        return
      }
      setSelectedReaction((prev) => {
        const next = prev === reaction ? null : reaction
        toast({
          title: next ? `${reactionMeta[reaction].label} 반응을 남겼어요` : "반응을 취소했어요",
          duration: 1800,
          className:
            "rounded-xl border border-[var(--awave-border)] bg-white text-[var(--awave-text)] shadow-md",
        })
        return next
      })
    },
    [notifyAuthRequired, readOnly]
  )

  const commentCount = feed.commentCount ?? 0
  const totalReactions = (feed.reactions?.like ?? 0) + (feed.reactions?.funny ?? 0) + (feed.reactions?.dislike ?? 0)
  const avatarSrc = feed.author.avatarUrl ?? generateAvatarSVG(feed.author.nickname, 40)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl border border-[var(--awave-border)] bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--awave-button)]/20",
        readOnly ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:shadow-md"
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={avatarSrc} alt={feed.author.nickname} className="object-cover" />
            <AvatarFallback className="bg-[var(--awave-secondary)] text-sm font-semibold text-[var(--awave-text)]">
              {feed.author.nickname.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-[var(--awave-text)]">@{feed.author.nickname}</p>
            <p className="text-xs text-[var(--awave-text-light)]">{dateLabel}</p>
          </div>
        </div>
        <span className="text-lg text-[var(--awave-text-light)]/70">⋯</span>
      </header>

      {feed.imageUrl && (
        <div className="relative mt-3 aspect-square w-full overflow-hidden bg-[var(--awave-secondary)]">
          <Image
            src={feed.imageUrl}
            alt="피드 이미지"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
            unoptimized
          />
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed text-[var(--awave-text)] line-clamp-3">{feed.content}</p>

      <footer className="mt-3 flex items-center justify-between gap-4">
        <div className="text-xs text-[var(--awave-text-light)]">
          댓글 {commentCount} · 반응 {totalReactions}
        </div>
        <div className="flex items-center gap-3 text-xl text-[var(--awave-text-light)]">
          {reactionOrder.map((key) => (
            <motion.button
              key={key}
              type="button"
              onClick={handleReactionClick(key)}
              className={cn(
                "rounded-full p-1 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200",
                selectedReaction === key ? reactionMeta[key].activeColor : reactionMeta[key].idleColor
              )}
              aria-pressed={selectedReaction === key}
              aria-label={reactionMeta[key].label}
              disabled={readOnly}
              animate={selectedReaction === key ? wiggleAnimation : { rotate: 0 }}
              transition={wiggleTransition}
              whileTap={{ scale: 0.92 }}
            >
              {reactionMeta[key].emoji}
            </motion.button>
          ))}
        </div>
      </footer>
    </article>
  )
}
