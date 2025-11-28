"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Eye, Filter, Loader2, ShieldCheck, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockApi, type FeedRow } from "@/lib/mockApi"

const visibilityLabel: Record<FeedRow["visibility"], string> = {
  visible: "정상",
  hidden: "숨김",
  deleted: "삭제",
}

export default function AdminFeedPage() {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"latest" | "visibility">("latest")
  const [feeds, setFeeds] = useState<FeedRow[]>([])
  const [selectedFeed, setSelectedFeed] = useState<FeedRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFeeds() {
      setLoading(true)
      try {
        const list = await mockApi.getFeeds()
        setFeeds(list)
        setSelectedFeed(list[0] ?? null)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "피드 목록을 불러오지 못했습니다."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadFeeds()
  }, [])

  const filtered = useMemo(() => {
    const list = feeds.filter(
      (f) => f.content.includes(search) || f.author.includes(search) || `${f.id}`.includes(search)
    )
    return list.sort((a, b) => {
      if (sort === "visibility") return a.visibility.localeCompare(b.visibility)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [feeds, search, sort])

  const handleVisibility = async (feedId: number, visibility: FeedRow["visibility"]) => {
    setMutatingId(feedId)
    try {
      const updated = await mockApi.updateFeedVisibility(feedId, visibility)
      setFeeds((prev) => prev.map((f) => (f.id === feedId ? updated : f)))
      if (selectedFeed?.id === feedId) {
        setSelectedFeed(updated)
      }
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "피드 상태를 변경하지 못했습니다."
      setError(message)
    } finally {
      setMutatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--awave-text)]">피드 관리</p>
          <p className="text-sm text-[var(--awave-text-light)]">노출/숨김/삭제 및 관리자 상세 보기</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="내용/작성자/ID 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" className="gap-2" type="button">
            <Filter className="size-4" />
            필터
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => setSort(sort === "latest" ? "visibility" : "latest")}
            className="text-xs"
          >
            {sort === "latest" ? "상태순" : "최신순"}
          </Button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-[var(--awave-border)] bg-white shadow-sm">
        <div className="grid grid-cols-6 items-center border-b border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-xs font-semibold text-[var(--awave-text-light)]">
          <span className="col-span-2">내용</span>
          <span>작성자</span>
          <span>작성일</span>
          <span className="text-center">ID</span>
          <span className="text-center">상태</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-4 text-sm text-[var(--awave-text-light)]">
            <Loader2 className="size-4 animate-spin" />
            불러오는 중입니다.
          </div>
        )}
        {!loading &&
          filtered.map((feed) => (
            <button
              key={feed.id}
              onClick={() => setSelectedFeed(feed)}
              className={`grid grid-cols-6 items-center border-b border-[var(--awave-border)] px-3 py-3 text-left text-sm transition last:border-b-0 hover:bg-[var(--awave-secondary)] ${
                selectedFeed?.id === feed.id ? "bg-[var(--awave-secondary)]" : ""
              }`}
            >
              <div className="col-span-2 space-y-1">
                <p className="font-semibold text-[var(--awave-text)] line-clamp-1">{feed.content}</p>
                <div className="flex gap-2 text-xs text-[var(--awave-text-light)]">
                  <a href={`/feed/${feed.id}`} className="text-[var(--awave-button)] hover:underline">
                    상세보기
                  </a>
                  <span className="text-[var(--awave-border)]">|</span>
                  <span className="text-[var(--awave-button)]">관리자 보기</span>
                </div>
              </div>
              <span className="text-[var(--awave-text)]">@{feed.author}</span>
              <span className="text-[var(--awave-text-light)]">{feed.createdAt.slice(0, 10)}</span>
              <span className="text-center text-[var(--awave-text)]">{feed.id}</span>
              <div className="flex justify-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    feed.visibility === "visible"
                      ? "bg-emerald-50 text-emerald-700"
                      : feed.visibility === "hidden"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-600"
                  }`}
                >
                  {visibilityLabel[feed.visibility]}
                </span>
              </div>
              <div className="col-span-6 mt-2 flex gap-2 text-xs md:col-span-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleVisibility(feed.id, "hidden")
                  }}
                  disabled={mutatingId === feed.id || feed.visibility === "hidden"}
                >
                  {mutatingId === feed.id ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  숨기기
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleVisibility(feed.id, "deleted")
                  }}
                  disabled={mutatingId === feed.id || feed.visibility === "deleted"}
                >
                  {mutatingId === feed.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  삭제
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleVisibility(feed.id, "visible")
                  }}
                  disabled={mutatingId === feed.id || feed.visibility === "visible"}
                >
                  {mutatingId === feed.id ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  복구
                </Button>
              </div>
            </button>
          ))}
      </div>

      {selectedFeed && (
        <div className="rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--awave-text)]">관리자 보기</p>
              <p className="text-xs text-[var(--awave-text-light)]">운영자 전용 상세 정보와 조치</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                selectedFeed.visibility === "visible"
                  ? "bg-emerald-50 text-emerald-700"
                  : selectedFeed.visibility === "hidden"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-600"
              }`}
            >
              {visibilityLabel[selectedFeed.visibility]}
            </span>
          </div>

          <div className="mt-3 space-y-2 text-sm text-[var(--awave-text)]">
            <p className="font-semibold">#{selectedFeed.id} · @{selectedFeed.author}</p>
            <p className="whitespace-pre-line rounded-lg bg-[var(--awave-secondary)] px-3 py-2 text-[var(--awave-text)]">
              {selectedFeed.content}
            </p>
            <p className="text-xs text-[var(--awave-text-light)]">작성일: {selectedFeed.createdAt}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleVisibility(selectedFeed.id, "hidden")}
              disabled={mutatingId === selectedFeed.id || selectedFeed.visibility === "hidden"}
            >
              {mutatingId === selectedFeed.id ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              숨기기
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleVisibility(selectedFeed.id, "deleted")}
              disabled={mutatingId === selectedFeed.id || selectedFeed.visibility === "deleted"}
            >
              {mutatingId === selectedFeed.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              삭제
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleVisibility(selectedFeed.id, "visible")}
              disabled={mutatingId === selectedFeed.id || selectedFeed.visibility === "visible"}
            >
              {mutatingId === selectedFeed.id ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              복구
            </Button>
            <a
              href={`/feed/${selectedFeed.id}`}
              className="inline-flex items-center rounded-md border border-[var(--awave-border)] px-3 py-2 text-sm text-[var(--awave-text)] hover:bg-[var(--awave-secondary)]"
            >
              사용자 상세보기
            </a>
          </div>

          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            숨김이면 작성자 본인만 보이고, 삭제 시 사용자/작성자 모두 노출되지 않습니다. 복구 시 다시 노출됩니다.
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}
    </div>
  )
}
