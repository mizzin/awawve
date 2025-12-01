"use client"

import Image from "next/image"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generateAvatarSVG } from "@/lib/utils/avatar"
import { supabase } from "@/lib/supabaseClient"

type ReactionKey = "like" | "funny" | "dislike"

type Comment = {
  id: string
  user: {
    id: string
    nickname: string
    avatarUrl: string | null
  }
  text: string
  created_at: string
}

type FeedDetail = {
  id: string
  author: {
    id: string | null
    nickname: string
    avatarUrl: string | null
  }
  content: string
  imageUrl: string | null
  reactions: Record<ReactionKey, number>
  comments: Comment[]
  created_at: string
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
}

type CommentRow = {
  id: string
  feed_id: string
  user_id: string
  content: string
  created_at: string
  users?:
    | {
        id: string
        nickname: string | null
        profile_image: string | null
      }
    | null
}

const reactionMeta: Record<
  ReactionKey,
  { label: string; emoji: string; activeColor: string; bg: string }
> = {
  like: { label: "좋아요", emoji: "😄", activeColor: "text-[var(--awave-button)]", bg: "bg-[var(--awave-secondary)]" },
  funny: { label: "ㅋㅋㅋ", emoji: "🤭", activeColor: "text-[var(--awave-button)]", bg: "bg-[var(--awave-secondary)]" },
  dislike: { label: "별로야", emoji: "😐", activeColor: "text-[var(--awave-text-light)]", bg: "bg-[var(--awave-secondary)]" },
}

type FloatingEmoji = {
  id: string
  key: ReactionKey
  emoji: string
  x: number
  rise: number
}

export default function FeedDetailPage() {
  const params = useParams()
  const feedId = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const [post, setPost] = useState<FeedDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionKey, number>>({
    like: 0,
    funny: 0,
    dislike: 0,
  })
  const [selectedReaction, setSelectedReaction] = useState<ReactionKey | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([])
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

const mapCommentRow = useCallback((row: CommentRow): Comment => {
  const u = Array.isArray(row.users) ? row.users[0] : row.users;


  return {
    id: row.id,
    user: {
      id: row.user_id,
      nickname: u?.nickname ? u.nickname.trim() : "익명",
      avatarUrl: u?.profile_image ?? null,
    },
    text: row.content,
    created_at: row.created_at,
  }
}, []);


  useEffect(() => {
    const syncUser = async () => {
      const { data } = await supabase.auth.getSession()
      setAuthUserId(data.session?.user?.id ?? null)
    }
    void syncUser()

    const fetchComments = async (feedId: string) => {
      const { data: commentRows, error: commentError } = await supabase
        .from("feed_comments")
        .select(
          "id, feed_id, user_id, content, created_at, users:users!feed_comments_user_id_fkey(id, nickname, profile_image)"
        )
        .eq("feed_id", feedId)
        .order("created_at", { ascending: true })

      if (commentError) {
        console.error("[feed detail] comments fetch error", commentError)
        return
      }

      if (commentRows) {
        setComments(commentRows.map(mapCommentRow))
      }
    }

    const fetchFeed = async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from("feeds")
        .select(
          "id, user_id, content, image_url, created_at, users:users!feeds_user_id_fkey(id, nickname, profile_image)"
        )
        .eq("id", feedId)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .maybeSingle<FeedRow>()

      if (fetchError) {
        console.error("[feed detail] fetch error", fetchError)
        setError("피드를 불러오지 못했습니다.")
        setLoading(false)
        return
      }

      if (!data) {
        setError("존재하지 않는 피드입니다.")
        setLoading(false)
        return
      }

      const joinedUser = Array.isArray(data.users) ? data.users[0] : data.users
      const maskUserId = (userId: string | null) => (userId ? `익명-${userId.slice(0, 4)}` : "익명")
      const nickname = joinedUser?.nickname?.trim() || maskUserId(data.user_id)

      const mapped: FeedDetail = {
        id: `${data.id}`,
        author: {
          id: data.user_id,
          nickname,
          avatarUrl: joinedUser?.profile_image ?? null,
        },
        content: data.content,
        imageUrl: data.image_url,
        reactions: { like: 0, funny: 0, dislike: 0 },
        comments: [],
        created_at: data.created_at,
      }

      setPost(mapped)
      setReactionCounts(mapped.reactions)
      void fetchComments(`${data.id}`)
      setLoading(false)
    }

    void fetchFeed()
  }, [feedId, mapCommentRow])

  const triggerEmojiBurst = useCallback((key: ReactionKey) => {
    const count = Math.floor(Math.random() * 3) + 3
    const burst: FloatingEmoji[] = Array.from({ length: count }).map((_, index) => ({
      id: `${key}-${performance.now()}-${index}`,
      key,
      emoji: reactionMeta[key].emoji,
      x: (Math.random() - 0.5) * 36,
      rise: 40 + Math.random() * 32,
    }))

    setFloatingEmojis((prev) => [...prev, ...burst])

    burst.forEach((item) => {
      window.setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((emoji) => emoji.id !== item.id))
      }, 950)
    })
  }, [])

  const handleReaction = (key: ReactionKey) => {
    triggerEmojiBurst(key)
    setReactionCounts((prev) => {
      const nextCounts = { ...prev }
      if (selectedReaction === key) {
        nextCounts[key] = Math.max(0, nextCounts[key] - 1)
        setSelectedReaction(null)
        return nextCounts
      }

      if (selectedReaction) {
        nextCounts[selectedReaction] = Math.max(0, nextCounts[selectedReaction] - 1)
      }
      nextCounts[key] = nextCounts[key] + 1
      setSelectedReaction(key)
      return nextCounts
    })
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleCommentSubmit = useCallback(async () => {
    const text = commentInput.trim()
    if (!text) return
    if (!post?.id) return

    setCommentSubmitting(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      alert("로그인 후 댓글을 남겨주세요.")
      setCommentSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from("feed_comments")
      .insert({
        feed_id: post.id,
        user_id: userData.user.id,
        content: text,
      })
      .select(
        "id, feed_id, user_id, content, created_at, users:users!feed_comments_user_id_fkey(id, nickname, profile_image)"
      )
      .single()

    if (error) {
      console.error("댓글을 저장하지 못했습니다.", error)
      alert("댓글을 저장하지 못했습니다. 다시 시도해주세요.")
      setCommentSubmitting(false)
      return
    }

    if (data) {
      setComments((prev) => [...prev, mapCommentRow(data as CommentRow)])
      setCommentInput("")
    }

    setCommentSubmitting(false)
  }, [commentInput, mapCommentRow, post?.id])

  const formattedDate = useMemo(() => (post ? formatKoreanDate(post.created_at) : ""), [post])
  const isMine = post?.author.id && authUserId ? authUserId === post.author.id : false

  const menuItems = isMine
    ? [
        { label: "수정", action: () => (post ? router.push(`/feed/${post.id}/edit`) : undefined) },
        { label: "공유", action: () => alert("공유 기능은 준비 중입니다.") },
        { label: "삭제", action: () => alert("삭제 기능은 준비 중입니다.") },
      ]
    : [
        { label: "신고", action: () => alert("신고가 접수되었습니다.") },
        { label: "공유", action: () => alert("공유 기능은 준비 중입니다.") },
      ]

  useOnClickOutside(menuRef, closeMenu)

  if (loading) {
    return (
      <UserLayout>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-12">
          <p className="text-center text-sm text-[var(--awave-text-light)]">피드를 불러오는 중입니다...</p>
        </div>
      </UserLayout>
    )
  }

  if (error || !post) {
    return (
      <UserLayout>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-12">
          <p className="text-center text-sm text-[var(--awave-text-light)]">{error ?? "피드를 찾을 수 없습니다."}</p>
          <Button className="mt-4 self-center" variant="outline" onClick={() => router.push("/feed")}>
            피드 목록으로 돌아가기
          </Button>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-white text-[var(--awave-text)]">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-32 pt-6">
          <section className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[var(--awave-secondary)]">
                <Image
                  src={post.author.avatarUrl ?? generateAvatarSVG(post.author.nickname, 36)}
                  alt={`${post.author.nickname} avatar`}
                  fill
                  className="object-cover"
                  sizes="36px"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-base font-semibold">@{post.author.nickname}</p>
                <p className="text-xs text-[#999999]">{formattedDate}</p>
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--awave-border)] text-[var(--awave-text-light)] transition hover:border-[var(--awave-button)]/30"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="옵션 메뉴"
              >
                <MoreHorizontal className="size-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-36 rounded-xl border border-[var(--awave-border)] bg-white py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        item.action()
                        setMenuOpen(false)
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-[var(--awave-text)] hover:bg-[var(--awave-secondary)]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

        {post.imageUrl && (
          <div className="mt-6 overflow-hidden rounded-xl bg-[var(--awave-secondary)]">
            <div className="relative aspect-square w-full">
              <Image
                src={post.imageUrl}
                alt="피드 이미지"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 640px"
                priority
                unoptimized
              />
            </div>
          </div>
        )}

          <section className="mt-6 space-y-3">
            <p className="text-lg leading-relaxed">{post.content}</p>
          </section>

          <section className="mt-8 space-y-4">
            <div className="text-sm text-[var(--awave-text-light)]">반응</div>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(reactionMeta) as ReactionKey[]).map((key) => {
                const meta = reactionMeta[key]
                const isActive = selectedReaction === key
                return (
                  <div key={key} className="relative">
                    <button
                      type="button"
                      onClick={() => handleReaction(key)}
                      className={cn(
                        "flex w-full flex-col items-center rounded-xl border px-3 py-3 text-sm font-medium transition transform",
                        isActive
                          ? `${meta.bg} border-[var(--awave-button)] ring-2 ring-[var(--awave-button)] ${meta.activeColor} scale-105 shadow-[0_8px_20px_rgba(23,68,132,0.12)]`
                          : "border-[var(--awave-border)] text-[var(--awave-text)] hover:border-[var(--awave-button)]/40 hover:shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
                      )}
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="mt-1">{meta.label}</span>
                    </button>
                    <div className="pointer-events-none absolute inset-0 overflow-visible">
                      <AnimatePresence>
                        {floatingEmojis
                          .filter((item) => item.key === key)
                          .map((item) => (
                            <motion.span
                              key={item.id}
                              initial={{ opacity: 0, y: 8, scale: 0.8, x: item.x }}
                              animate={{ opacity: 1, y: -item.rise, scale: 1 }}
                              exit={{ opacity: 0, y: -(item.rise + 24), scale: 0.9 }}
                              transition={{ duration: 0.9, ease: "easeOut" }}
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 text-lg"
                            >
                              {item.emoji}
                            </motion.span>
                          ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">댓글 {comments.length}개</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--awave-button)]"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
              >
                모두보기
              </Button>
            </div>

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="relative mt-1 h-8 w-8 overflow-hidden rounded-full bg-[var(--awave-secondary)]">
                    <Image
                      src={comment.user.avatarUrl ?? generateAvatarSVG(comment.user.nickname, 32)}
                      alt={`${comment.user.nickname} profile`}
                      fill
                      className="object-cover"
                      sizes="32px"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 rounded-xl bg-[var(--awave-secondary)] px-4 py-2">
                    <p className="text-sm font-semibold text-[var(--awave-text)]">@{comment.user.nickname}</p>
                    <p className="text-sm text-[var(--awave-text)]">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative rounded-xl border border-[var(--awave-border)] px-3 py-2">
              <Input
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="댓글을 남겨보세요"
                className="border-none bg-transparent px-0 pr-16 text-sm focus-visible:ring-0"
              />
              {commentInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    void handleCommentSubmit()
                  }}
                  disabled={commentSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm font-semibold text-[var(--awave-button)] transition hover:bg-[var(--awave-secondary)] disabled:opacity-60"
                >
                  등록
                </button>
              )}
            </div>
          </section>
        </main>
      </div>
    </UserLayout>
  )
}

function formatKoreanDate(isoString: string) {
  const date = new Date(isoString)
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function useOnClickOutside(ref: MutableRefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function listener(event: MouseEvent | TouchEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler()
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler])
}
