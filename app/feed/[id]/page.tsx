"use client"

import Image from "next/image"
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, MoreHorizontal, SendHorizontal } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ReactionKey = "like" | "funny" | "dislike"

type Comment = {
  id: number
  user: {
    id: number
    nickname: string
    avatarUrl: string
  }
  text: string
  created_at: string
}

type FeedDetail = {
  id: number
  author: {
    id: number
    nickname: string
    avatarUrl: string
  }
  content: string
  imageUrl: string | null
  category: string | null
  location:
    | {
        place_name: string
        latitude: number
        longitude: number
      }
    | null
  reactions: Record<ReactionKey, number>
  comments: Comment[]
  created_at: string
}

const DUMMY_POST: FeedDetail = {
  id: 42,
  author: {
    id: 1,
    nickname: "소금빵수집가",
    avatarUrl: "https://i.pravatar.cc/120?img=5",
  },
  content:
    "오늘은 성수동에서 새로 문 연 카페를 다녀왔어요. 콜드브루와 말차 조합이 생각보다 잘 어울리더라고요. 멀지 않은 곳에 노을이 너무 예쁘게 들어오는 포인트가 있어서 오랜만에 마음 편하게 쉬다 왔습니다.",
  imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  category: "카페",
  location: {
    place_name: "성수 스테이트 카페",
    latitude: 37.5446,
    longitude: 127.0558,
  },
  reactions: {
    like: 24,
    funny: 5,
    dislike: 1,
  },
  comments: [
    {
      id: 11,
      user: { id: 2, nickname: "트레블러", avatarUrl: "https://i.pravatar.cc/120?img=10" },
      text: "여기 예약 어려운데 다녀오셨네요! 분위기 어땠나요?",
      created_at: "2025-02-18T08:30:00Z",
    },
    {
      id: 12,
      user: { id: 3, nickname: "vanillalatte", avatarUrl: "https://i.pravatar.cc/120?img=32" },
      text: "말차 콜드브루라니... 담주에 바로 가볼게요.",
      created_at: "2025-02-18T09:12:00Z",
    },
  ],
  created_at: "2025-02-18T07:15:00Z",
}

const reactionMeta: Record<
  ReactionKey,
  { label: string; emoji: string; activeColor: string; bg: string }
> = {
  like: { label: "좋아요", emoji: "😄", activeColor: "text-[var(--awave-primary)]", bg: "bg-[var(--awave-secondary)]" },
  funny: { label: "ㅋㅋㅋ", emoji: "🤭", activeColor: "text-[var(--awave-text)]", bg: "bg-[var(--awave-secondary)]" },
  dislike: { label: "별로야", emoji: "😐", activeColor: "text-[var(--awave-text-light)]", bg: "bg-[var(--awave-secondary)]" },
}

export default function FeedDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const post = useMemo(() => ({ ...DUMMY_POST, id: Number(params.id) || DUMMY_POST.id }), [params.id])
  const currentUserId = 1
  const isMine = currentUserId === post.author.id

  const [, setReactionCounts] = useState(post.reactions)
  const [selectedReaction, setSelectedReaction] = useState<ReactionKey | null>(null)
  const [comments, setComments] = useState<Comment[]>(post.comments)
  const [commentInput, setCommentInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

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
        avatarUrl: "https://i.pravatar.cc/120?img=47",
      },
      text,
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [...prev, newComment])
    setCommentInput("")
  }

  const formattedDate = formatKoreanDate(post.created_at)

  const menuItems = isMine
    ? [
        { label: "수정", action: () => router.push(`/feed/${post.id}/edit`) },
        { label: "공유", action: () => alert("공유 기능은 준비 중입니다.") },
        { label: "삭제", action: () => alert("삭제 기능은 준비 중입니다.") },
      ]
    : [
        { label: "신고", action: () => alert("신고가 접수되었습니다.") },
        { label: "공유", action: () => alert("공유 기능은 준비 중입니다.") },
      ]

  useOnClickOutside(menuRef, closeMenu)

  return (
    <UserLayout>
      <div className="min-h-screen bg-white text-[var(--awave-text)]">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-48 pt-6">
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[var(--awave-secondary)]">
              <Image
                src={post.author.avatarUrl}
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--awave-border)] text-[var(--awave-text-light)] transition hover:border-[var(--awave-primary)]/30"
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

        {(post.category || post.location) && (
          <section className="mt-4 space-y-3 rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-3">
            {post.category && (
              <span className="inline-flex items-center rounded-full bg-[var(--awave-secondary)] px-3 py-1 text-sm font-medium text-[var(--awave-primary)]">
                #{post.category}
              </span>
            )}
            {post.location && (
              <div className="flex items-center gap-2 text-sm text-[var(--awave-text-light)]">
                <MapPin className="size-4 text-[var(--awave-primary)]" />
                <span>{post.location.place_name}</span>
              </div>
            )}
          </section>
        )}

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
            <Button variant="ghost" size="sm" className="text-[var(--awave-primary)]" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
              모두보기
            </Button>
          </div>

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="relative mt-1 h-8 w-8 overflow-hidden rounded-full bg-[var(--awave-secondary)]">
                  <Image
                    src={comment.user.avatarUrl}
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
