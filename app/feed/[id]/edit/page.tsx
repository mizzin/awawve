"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ImageIcon, LoaderCircle, MapPin, X } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import SearchLocationModal from "@/app/feed/new/modal/SearchLocationModal"

const MAX_CHAR_COUNT = 300
const FEED_IMAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_FEED_BUCKET
const TASTE_TAGS = ["여행", "식당", "마트", "카페", "화장품", "자동차", "호텔", "취미", "주거", "행정", "생활팁"]

type SelectedLocation = {
  placeId?: string
  placeName: string
  address: string
  lat: number
  lng: number
  isCustom?: boolean
}

type FeedRow = {
  id: string
  user_id: string | null
  content: string
  image_url: string | null
  place_id: string | null
  place_name: string | null
  category: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export default function EditFeedPage() {
  const router = useRouter()
  const params = useParams()
  const feedId = Array.isArray(params.id) ? params.id[0] : params.id

  const [body, setBody] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [initialLocationKey, setInitialLocationKey] = useState<string | null>(null)
  const [locationLocked, setLocationLocked] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [body])

  useEffect(() => {
    const syncUser = async () => {
      const { data } = await supabase.auth.getSession()
      setAuthUserId(data.session?.user?.id ?? null)
    }
    void syncUser()
  }, [])

  useEffect(() => {
    if (!feedId) return
    const lockKey = `feed-location-lock-${feedId}`
    const locked = typeof window !== "undefined" ? window.localStorage.getItem(lockKey) === "1" : false
    setLocationLocked(locked)
  }, [feedId])

  useEffect(() => {
    const fetchFeed = async () => {
      if (!feedId) return
      setLoading(true)
      const { data, error } = await supabase
        .from("feeds")
        .select("id, user_id, content, image_url, place_id, place_name, category, address, latitude, longitude, created_at")
        .eq("id", feedId)
        .maybeSingle<FeedRow>()

      if (error || !data) {
        console.error("[feed edit] fetch error", error)
        alert("게시글을 불러오지 못했습니다.")
        router.push("/feed")
        return
      }

      setBody(data.content ?? "")
      setSelectedTag(data.category ?? null)
      if (data.address && data.latitude !== null && data.longitude !== null) {
        const loc = {
          placeId: data.place_id ?? undefined,
          placeName: data.place_name ?? data.address,
          address: data.address,
          lat: data.latitude,
          lng: data.longitude,
        }
        setLocation(loc)
        setInitialLocationKey(buildLocationKey(loc))
      }
      setImageUrl(data.image_url ?? null)
      setCreatedAt(new Date(data.created_at))
      setLoading(false)
    }

    void fetchFeed()
  }, [feedId, router])

  const handleBodyChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value.slice(0, MAX_CHAR_COUNT)
    setBody(nextValue)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (!authUserId) {
      alert("로그인 정보가 없습니다. 다시 로그인해 주세요.")
      return
    }

    if (locationLocked && hasLocationChanged()) {
      alert("위치는 한 번만 수정할 수 있습니다.")
      return
    }

    setSaving(true)
    try {
      const updates = {
        content: body.trim(),
        category: selectedTag ?? null,
        place_id: location?.placeId ?? null,
        place_name: location?.placeName ?? null,
        address: location?.address ?? null,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("feeds").update(updates).eq("id", feedId).eq("user_id", authUserId)
      if (error) {
        throw error
      }

      // lock location after first successful change
      if (hasLocationChanged()) {
        const lockKey = `feed-location-lock-${feedId}`
        window.localStorage.setItem(lockKey, "1")
        setLocationLocked(true)
      }

      router.push(`/feed/${feedId}`)
    } catch (err) {
      console.error("[feed edit] update error", err)
      alert("수정에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSaving(false)
    }
  }

  const hasLocationChanged = () => {
    if (!initialLocationKey && !location) return false
    return buildLocationKey(location) !== initialLocationKey
  }

  const isLateCategoryEdit = useMemo(() => {
    if (!createdAt) return false
    const now = new Date()
    return now.getTime() - createdAt.getTime() > 30 * 60 * 1000
  }, [createdAt])

  const remainingCount = MAX_CHAR_COUNT - body.length
  const canSubmit = body.trim().length > 0 && !saving

  if (loading) {
    return (
      <UserLayout>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 text-sm text-[var(--awave-text-light)]">
          불러오는 중...
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-white text-[var(--awave-text)]">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-48 pt-8 font-sans"
        >
          <section className="space-y-2">
            <p className="text-sm font-semibold text-[var(--awave-text-light)]">NOW</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--awave-text)]">게시글 수정</h1>
          </section>

          <section className="mt-6 rounded-xl border border-transparent bg-[var(--awave-secondary)] p-4 shadow-[0_6px_40px_-32px_rgba(0,0,0,0.45)]">
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={3}
                value={body}
                maxLength={MAX_CHAR_COUNT}
                onChange={handleBodyChange}
                placeholder="내용을 수정하세요"
                className="w-full resize-none bg-transparent text-lg leading-relaxed text-[var(--awave-text)] placeholder:text-[var(--awave-text-light)] focus:outline-none"
              />
              <div className="absolute bottom-0 right-0 text-xs text-[var(--awave-text-light)]">{remainingCount}</div>
            </div>
          </section>

          <section className="mt-8 space-y-2">
            <p className="text-sm font-medium text-[var(--awave-text-light)]">이미지</p>
            {imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-[var(--awave-border)]">
                <div className="relative h-64 w-full">
                  <Image
                    src={imageUrl}
                    alt="피드 이미지"
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
                  <ImageIcon className="size-5" />
                  <p className="text-sm font-medium">사진은 수정/삭제할 수 없습니다.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--awave-border)] bg-white px-6 py-6 text-center text-sm text-[var(--awave-text-light)]">
                첨부된 사진이 없습니다.
              </div>
            )}
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--awave-text-light)]">카테고리</p>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="text-xs font-medium text-[var(--awave-primary)]"
                >
                  선택 해제
                </button>
              )}
            </div>
            {isLateCategoryEdit && (
              <p className="text-xs text-amber-600">게시 후 30분이 지나 수정 중입니다. 이력이 남을 수 있습니다.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {TASTE_TAGS.map((tag) => {
                const isActive = selectedTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(isActive ? null : tag)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "border-[var(--awave-primary)] bg-[var(--awave-primary)] text-white shadow-sm"
                        : "border-[var(--awave-border)] bg-white text-[var(--awave-text)] hover:border-[var(--awave-primary)]/40"
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--awave-text-light)]">위치</p>
              {location && (
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  className="text-xs font-medium text-[var(--awave-text-light)]"
                  disabled={locationLocked}
                >
                  초기화
                </button>
              )}
            </div>
            {locationLocked && (
              <p className="text-xs text-amber-600">위치는 한 번만 수정 가능합니다. 더 이상 변경할 수 없습니다.</p>
            )}
            <div className="rounded-xl border border-[var(--awave-border)] bg-white px-4 py-3">
              {location ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--awave-text)]">{location.placeName}</p>
                    <p className="truncate text-xs text-[var(--awave-text-light)]">{location.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="inline-flex items-center rounded-full bg-[var(--awave-secondary)] px-3 py-1 text-xs font-semibold text-[var(--awave-text)]"
                    disabled={locationLocked}
                  >
                    <X className="mr-1 size-3" />
                    제거
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--awave-text-light)]">위치를 선택하세요</p>
                  <button
                    type="button"
                    onClick={() => setShowSearchModal(true)}
                    className="inline-flex items-center rounded-full bg-[var(--awave-primary)] px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    disabled={locationLocked}
                  >
                    <MapPin className="mr-1 size-3" />
                    위치 선택
                  </button>
                </div>
              )}
            </div>
          </section>

          <div className="sticky bottom-0 left-0 right-0 mt-10 flex items-center gap-3 border-t border-[var(--awave-border)] bg-white/90 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/feed/${feedId}`)}
              disabled={saving}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {saving ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </form>
      </div>

      {showSearchModal && (
        <SearchLocationModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelect={(loc) => {
            setLocation({
              placeId: loc.placeId,
              placeName: loc.placeName,
              address: loc.address,
              lat: loc.lat,
              lng: loc.lng,
            })
            setShowSearchModal(false)
          }}
        />
      )}
    </UserLayout>
  )
}

function buildLocationKey(loc: SelectedLocation | null) {
  if (!loc) return null
  return `${loc.address ?? ""}-${loc.lat}-${loc.lng}`
}
