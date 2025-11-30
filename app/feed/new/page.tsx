"use client"

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ImageIcon, LoaderCircle, MapPin, Search, X } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { useUserAccess } from "@/lib/useUserAccess"

const MAX_CHAR_COUNT = 300
const FEED_IMAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_FEED_BUCKET
const TASTE_TAGS = ["여행", "식당", "마트", "카페", "화장품", "자동차", "호텔"]

type SelectedLocation = {
  placeName: string
  address: string
  lat: number
  lng: number
  isCustom?: boolean
}

const POPULAR_PLACES: SelectedLocation[] = [
  {
    placeName: "서울 시청",
    address: "서울 중구 세종대로 110",
    lat: 37.5665,
    lng: 126.978,
  },
  {
    placeName: "부산 광안리 해수욕장",
    address: "부산 수영구 광안해변로 219",
    lat: 35.1531,
    lng: 129.1187,
  },
  {
    placeName: "제주 노형동 카페거리",
    address: "제주 제주시 노형동",
    lat: 33.4864,
    lng: 126.4816,
  },
  {
    placeName: "수원 화성행궁",
    address: "경기 수원시 팔달구 정조로 825",
    lat: 37.2819,
    lng: 127.0163,
  },
  {
    placeName: "전주 한옥마을",
    address: "전북 전주시 완산구 기린대로 99",
    lat: 35.815,
    lng: 127.1531,
  },
]

type MediaPreview = {
  file: File
  preview: string
}

const buildFeedImagePath = (file: File) => {
  const extensionCandidate =
    file.name.split(".").pop()?.toLowerCase() ||
    file.type.split("/").pop() ||
    "jpg"
  const extension = extensionCandidate.replace(/[^a-z0-9]/g, "") || "jpg"
  const uniqueSegment =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  const dateFolder = new Date().toISOString().slice(0, 10)

  return `feed/${dateFolder}/${uniqueSegment}.${extension}`
}

const uploadFeedImage = async (file: File) => {
  if (!FEED_IMAGE_BUCKET) {
    throw new Error("NEXT_PUBLIC_SUPABASE_FEED_BUCKET env is not configured.")
  }

  const filePath = buildFeedImagePath(file)
  const { data, error } = await supabase.storage.from(FEED_IMAGE_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  })

  if (error || !data?.path) {
    throw new Error(error?.message ?? "이미지 업로드에 실패했어요.")
  }

  const { data: publicData } = supabase.storage.from(FEED_IMAGE_BUCKET).getPublicUrl(data.path)
  if (!publicData?.publicUrl) {
    throw new Error("이미지 URL을 가져오지 못했어요.")
  }

  return publicData.publicUrl
}

export default function NewFeedPage() {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [media, setMedia] = useState<MediaPreview | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isLocked, isAuthenticated, lockReason } = useUserAccess(1)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [body])

  useEffect(() => {
    return () => {
      if (media?.preview) {
        URL.revokeObjectURL(media.preview)
      }
    }
  }, [media?.preview])

  const remainingCount = MAX_CHAR_COUNT - body.length
  const canSubmit = body.trim().length > 0 && !isSubmitting && !isLocked && isAuthenticated

  const handleBodyChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value.slice(0, MAX_CHAR_COUNT)
    setBody(nextValue)
  }

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("JPG 또는 PNG 파일만 업로드할 수 있어요.")
      return
    }

    if (media?.preview) {
      URL.revokeObjectURL(media.preview)
    }

    const preview = URL.createObjectURL(file)
    setMedia({ file, preview })
  }

  const handleMediaRemove = () => {
    if (media?.preview) {
      URL.revokeObjectURL(media.preview)
    }
    setMedia(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLocked || !isAuthenticated) {
      alert(lockReason ?? "신고 처리 중이라 게시물을 작성할 수 없습니다.")
      return
    }
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      const uploadedImageUrl = media?.file ? await uploadFeedImage(media.file) : null

      // TODO: Replace with Supabase insert for feed creation.
      console.info("게시물 데이터", {
        body,
        tag: selectedTag,
        location,
        imageUrl: uploadedImageUrl,
      })

      await new Promise((resolve) => setTimeout(resolve, 600))
      router.push("/feed")
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error ? error.message : "게시물을 저장하는 중 문제가 발생했어요."
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-white text-[var(--awave-text)]">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-48 pt-8 font-sans"
          aria-disabled={isLocked}
        >
          {isLocked && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              신고 접수로 인해 글쓰기가 잠겨 있어요. 로그인/로그아웃만 가능합니다.
            </div>
          )}
          <div className={cn(isLocked && "pointer-events-none opacity-60")}>
            <section className="space-y-2">
              <p className="text-sm font-semibold text-[var(--awave-text-light)]">NOW</p>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--awave-text)]">
                지금 어떤 순간인가요?
              </h1>
            </section>

            <section className="mt-6 rounded-xl border border-transparent bg-[var(--awave-secondary)] p-4 shadow-[0_6px_40px_-32px_rgba(0,0,0,0.45)]">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={3}
                  value={body}
                  maxLength={MAX_CHAR_COUNT}
                  onChange={handleBodyChange}
                  placeholder="무슨 생각해요?"
                  className="w-full resize-none bg-transparent text-lg leading-relaxed text-[var(--awave-text)] placeholder:text-[var(--awave-text-light)] focus:outline-none"
                  disabled={isLocked}
                />
                <span
                  className={cn(
                    "absolute bottom-0 right-0 text-xs font-medium transition-colors",
                    remainingCount <= 20 ? "text-[var(--awave-primary)]" : "text-[var(--awave-text-light)]"
                  )}
                >
                  {remainingCount}
                </span>
              </div>
            </section>

            <section className="mt-8 space-y-4">
              <div>
                <p className="text-sm font-medium text-[var(--awave-text-light)]">이미지 업로드 (선택)</p>
                <p className="text-xs text-[var(--awave-text-light)]">최대 1장, JPG 또는 PNG</p>
              </div>

              {!media && (
                <label
                  htmlFor="media-upload"
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--awave-border)] bg-white px-6 py-10 text-center text-sm text-[var(--awave-text-light)] transition hover:border-[var(--awave-primary)]/30 hover:bg-[var(--awave-secondary)]"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-[var(--awave-secondary)] text-[var(--awave-primary)]">
                    <ImageIcon className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--awave-text)]">이미지 첨부하기</p>
                    <p className="text-xs text-[var(--awave-text-light)]">드래그 & 드롭 또는 클릭</p>
                  </div>
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleMediaChange}
                    disabled={isLocked}
                  />
                </label>
              )}

              {media && (
                <div className="relative overflow-hidden rounded-xl border border-[var(--awave-border)]">
                  <div className="relative h-64 w-full">
                    <Image
                      src={media.preview}
                      alt="업로드 미리보기"
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMediaRemove}
                    className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/70"
                    aria-label="이미지 삭제"
                    disabled={isLocked}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </section>

            <section className="mt-8 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--awave-text-light)]">취향 태그 (선택)</p>
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="text-xs font-medium text-[var(--awave-primary)]"
                    disabled={isLocked}
                  >
                    선택 해제
                  </button>
                )}
              </div>
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
                      disabled={isLocked}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--awave-text-light)]">위치 추가 (선택)</p>
                {location ? (
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="text-xs font-medium text-[var(--awave-text-light)]"
                    disabled={isLocked}
                  >
                    제거
                  </button>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2 rounded-xl border-[var(--awave-border)] bg-white py-6 text-base font-medium text-[var(--awave-text)]"
                onClick={() => setIsLocationModalOpen(true)}
                disabled={isLocked}
              >
                <MapPin className="size-5 text-[var(--awave-primary)]" />
                장소 추가
              </Button>

              {location && (
                <div className="space-y-3 rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--awave-text)]">
                        {location.placeName}
                      </p>
                      <p className="text-sm text-[var(--awave-text-light)]">{location.address}</p>
                      <p className="text-xs text-[var(--awave-text-light)]">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-[var(--awave-text-light)] hover:text-[var(--awave-text)]"
                      onClick={() => setLocation(null)}
                      disabled={isLocked}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[var(--awave-border)]">
                    <iframe
                      title="선택한 위치 미리보기"
                      src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
                      className="h-48 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}
            </section>

            <div className="mt-12 text-xs text-[var(--awave-text-light)]">
              사진, 태그, 위치는 모두 선택 사항이에요. 본문만으로도 바로 등록할 수 있어요.
            </div>

            <div className="fixed inset-x-0 bottom-20 border border-[var(--awave-border)] bg-white/95 px-5 py-4 shadow-lg sm:bottom-24">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-[var(--awave-primary)] py-6 text-base font-semibold text-white shadow-lg transition hover:opacity-90 disabled:bg-[var(--awave-text-light)]"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle className="size-4 animate-spin" />
                    등록 중...
                  </span>
                ) : (
                  "등록"
                )}
              </Button>
            </div>
          </div>
        </form>

        {isLocationModalOpen && (
          <LocationModal
            selectedLocation={location}
            onClose={() => setIsLocationModalOpen(false)}
            onSelect={(loc) => {
              setLocation(loc)
              setIsLocationModalOpen(false)
            }}
          />
        )}
      </div>
    </UserLayout>
  )
}

type LocationModalProps = {
  selectedLocation: SelectedLocation | null
  onSelect: (location: SelectedLocation) => void
  onClose: () => void
}

function LocationModal({ selectedLocation, onClose, onSelect }: LocationModalProps) {
  const [query, setQuery] = useState("")
  const [pinPosition, setPinPosition] = useState<{ x: number; y: number } | null>(() =>
    selectedLocation?.isCustom ? { x: 0.5, y: 0.5 } : null
  )
  const [pinLocation, setPinLocation] = useState<SelectedLocation | null>(() =>
    selectedLocation?.isCustom ? selectedLocation : null
  )

  const filteredPlaces = useMemo(() => {
    if (!query) return POPULAR_PLACES
    return POPULAR_PLACES.filter((place) => {
      const target = `${place.placeName} ${place.address}`.toLowerCase()
      return target.includes(query.toLowerCase())
    })
  }, [query])

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    const lat = 37.5665 + (0.5 - y) * 0.6
    const lng = 126.978 + (x - 0.5) * 0.6

    const customLocation: SelectedLocation = {
      placeName: "사용자 지정 위치",
      address: "핀으로 지정한 위치",
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      isCustom: true,
    }

    setPinPosition({ x, y })
    setPinLocation(customLocation)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 px-0 pb-0">
      <button
        type="button"
        className="flex-1"
        aria-label="모달 닫기"
        onClick={onClose}
      />
      <div
        className="relative rounded-t-xl bg-white px-5 pb-8 pt-5 shadow-[0_-4px_40px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-[var(--awave-text)]">장소 추가</p>
            <p className="text-xs text-[var(--awave-text-light)]">검색하거나 지도를 눌러 핀을 찍을 수 있어요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--awave-secondary)] text-[var(--awave-text-light)]"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--awave-text-light)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="장소를 검색해보세요"
            className="w-full rounded-xl border-[var(--awave-border)] bg-[var(--awave-secondary)] pl-10 pr-4 text-sm text-[var(--awave-text)]"
          />
        </div>

        <div className="mt-5 space-y-3">
          <div
            onClick={handleMapClick}
            className="relative flex h-56 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.2),rgba(255,255,255,0.6))]" />
            <p className="relative z-10 text-sm font-medium text-[var(--awave-text-light)]">터치해서 핀 놓기</p>
            {pinPosition && (
              <MapPin
                className="absolute -translate-x-1/2 -translate-y-full text-[var(--awave-primary)] drop-shadow-md"
                style={{
                  left: `${pinPosition.x * 100}%`,
                  top: `${pinPosition.y * 100}%`,
                }}
              />
            )}
          </div>
          {pinLocation && (
            <div className="rounded-xl bg-[var(--awave-secondary)] p-3 text-sm text-[var(--awave-text)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--awave-text)]">{pinLocation.placeName}</p>
                  <p className="text-xs text-[var(--awave-text-light)]">
                    {pinLocation.lat.toFixed(4)}, {pinLocation.lng.toFixed(4)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-[var(--awave-primary)] px-4 py-2 text-xs font-semibold text-white"
                  onClick={() => {
                    onSelect(pinLocation)
                    onClose()
                  }}
                >
                  이 위치 선택
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--awave-text-light)]">
            추천 장소
          </p>
          <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
            {filteredPlaces.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--awave-border)] px-4 py-6 text-center text-sm text-[var(--awave-text-light)]">
                검색 결과가 없어요.
              </p>
            )}
            {filteredPlaces.map((place) => (
              <button
                key={place.placeName}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--awave-border)] px-4 py-3 text-left transition hover:border-[var(--awave-primary)]/30 hover:bg-[var(--awave-secondary)]"
                onClick={() => {
                  onSelect(place)
                  onClose()
                }}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--awave-secondary)] text-[var(--awave-primary)]">
                  <MapPin className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--awave-text)]">{place.placeName}</p>
                  <p className="text-xs text-[var(--awave-text-light)]">{place.address}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
