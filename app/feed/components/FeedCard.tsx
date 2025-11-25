"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type ReactionKey = "like" | "funny" | "dislike"

const reactionMeta: Record<
  ReactionKey,
  { emoji: string; label: string; activeColor: string; idleColor: string }
> = {
  like: { emoji: "😄", label: "좋아요", activeColor: "text-[#3182F6]", idleColor: "text-gray-400" },
  funny: { emoji: "🤭", label: "ㅋㅋㅋ", activeColor: "text-[#F6C445]", idleColor: "text-gray-400" },
  dislike: { emoji: "😐", label: "별로야", activeColor: "text-[#868E96]", idleColor: "text-gray-400" },
}
const reactionOrder: ReactionKey[] = ["like", "funny", "dislike"]
const wiggleAnimation = { rotate: [0, -10, 10, -6, 6, 0] }
const wiggleTransition = { duration: 0.45, ease: "easeOut" }

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

  const handleCardClick = useCallback(() => {
    if (readOnly) {
      onRequireAuth?.()
      return
    }
    router.push(`/feed/${feed.id}`)
  }, [feed.id, onRequireAuth, readOnly, router])

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
        onRequireAuth?.()
        return
      }
      setSelectedReaction((prev) => (prev === reaction ? null : reaction))
    },
    [onRequireAuth, readOnly]
  )

  const commentCount = feed.commentCount ?? 0
  const totalReactions = (feed.reactions?.like ?? 0) + (feed.reactions?.funny ?? 0) + (feed.reactions?.dislike ?? 0)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl border border-zinc-100 bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200",
        readOnly ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:shadow-md"
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            {feed.author.avatarUrl ? (
              <AvatarImage src={feed.author.avatarUrl} alt={feed.author.nickname} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-indigo-200 to-sky-100 text-sm font-semibold text-zinc-700">
                {feed.author.nickname.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-zinc-900">@{feed.author.nickname}</p>
            <p className="text-xs text-gray-400">{dateLabel}</p>
          </div>
        </div>
        <span className="text-lg text-zinc-300">⋯</span>
      </header>

      {feed.imageUrl && (
        <div className="relative mt-3 aspect-square w-full overflow-hidden bg-zinc-100">
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

      <p className="mt-3 text-sm leading-relaxed text-zinc-700 line-clamp-3">{feed.content}</p>

      <footer className="mt-3 flex items-center justify-between gap-4">
        <div className="text-xs text-zinc-400">
          댓글 {commentCount} · 반응 {totalReactions}
        </div>
        <div className="flex items-center gap-3 text-xl text-zinc-400">
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
