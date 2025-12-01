"use client"

import Image from "next/image"
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, SendHorizontal } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generateAvatarSVG } from "@/lib/utils/avatar"
import { supabase } from "@/lib/supabaseClient"

type ReactionKey = "like" | "funny" | "dislike"

type Comment = {
  id: string | number
  user: {
    id: string | number
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

const reactionMeta: Record<
  ReactionKey,
  { label: string; emoji: string; activeColor: string; bg: string }
> = {
  like: { label: "좋아요", emoji: "😄", activeColor: "text-[var(--awave-button)]", bg: "bg-[var(--awave-secondary)]" },
  funny: { label: "ㅋㅋㅋ", emoji: "🤭", activeColor: "text-[var(--awave-button)]", bg: "bg-[var(--awave-secondary)]" },
  dislike: { label: "별로야", emoji: "😐", activeColor: "text-[var(--awave-text-light)]", bg: "bg-[var(--awave-secondary)]" },
}

export default function FeedDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [post, setPost] = useState<FeedDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentUserId = 1
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionKey, number>>({
    like: 0,
    funny: 0,
    dislike: 0,
  })
  const [selectedReaction, setSelectedReaction] = useState<ReactionKey | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from("feeds")
        .select(
          "id, user_id, content, image_url, created_at, users:users!feeds_user_id_fkey(id, nickname, profile_image)"
        )
        .eq("id", params.id)
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

      const mapped: FeedDetail = {
        id: `${data.id}`,
        author: {
          id: data.user_id,
          nickname: joinedUser?.nickname ?? data.user_id ?? "awave user",
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
      setComments(mapped.comments)
      setLoading(false)
    }

    void fetchFeed()
  }, [params.id])

  const handleReaction = (key: ReactionKey) => {
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

  const handleCommentSubmit = () => {
    const text = commentInput.trim()
    if (!text) return
    const newComment: Comment = {
      id: Date.now(),
      user: {
        id: currentUserId,
        nickname: "나",
        avatarUrl: null,
      },
      text,
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [...prev, newComment])
    setCommentInput("")
  }

  const formattedDate = useMemo(() => (post ? formatKoreanDate(post.created_at) : ""), [post])
  const isMine = post?.author.id ? currentUserId === post.author.id : false

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
        <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-48 pt-6">
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--awave-text-light)]">
            <span>작성 {formattedDate}</span>
            <span>·</span>
            <span>ID #{post.id}</span>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div className="text-sm text-[var(--awave-text-light)]">반응</div>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(reactionMeta) as ReactionKey[]).map((key) => {
              const meta = reactionMeta[key]
              const isActive = selectedReaction === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleReaction(key)}
                  className={cn(
                    "flex flex-col items-center rounded-xl border px-3 py-3 text-sm transition",
                    isActive
                      ? `${meta.bg} border-transparent ${meta.activeColor} font-semibold`
                      : "border-[var(--awave-border)] text-[var(--awave-text)]"
                  )}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="mt-1">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">댓글 {comments.length}개</p>
            <Button variant="ghost" size="sm" className="text-[var(--awave-button)]" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
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

          <div className="flex items-center gap-2 rounded-xl border border-[var(--awave-border)] px-3 py-2">
            <Input
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              placeholder="댓글을 남겨보세요"
              className="border-none bg-transparent px-0 text-sm focus-visible:ring-0"
            />
            <Button
              type="button"
              size="icon"
              className="rounded-full bg-[var(--awave-primary)] text-white"
              disabled={!commentInput.trim()}
              onClick={handleCommentSubmit}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-20 border border-[var(--awave-border)] bg-white/95 px-5 py-3 shadow-lg sm:bottom-24">
        <div className="flex gap-3">
          {(Object.keys(reactionMeta) as ReactionKey[]).map((key) => {
            const meta = reactionMeta[key]
            const isActive = selectedReaction === key
            return (
              <Button
                key={key}
                type="button"
                variant="outline"
                className={cn(
                  "flex-1 rounded-xl border px-3 py-5 text-base font-semibold",
                  isActive
                    ? `${meta.bg} border-transparent text-[var(--awave-primary)]`
                    : "border-[var(--awave-border)] text-[var(--awave-text)]"
                )}
                onClick={() => handleReaction(key)}
              >
                <span className="mr-2 text-lg">{meta.emoji}</span>
                {meta.label}
              </Button>
            )
          })}
        </div>
      </footer>
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
