"use client"

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ImageIcon, LoaderCircle, Search, X } from "lucide-react"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { useUserAccess } from "@/lib/useUserAccess"
import SearchLocationModal from "@/app/feed/new/modal/SearchLocationModal"

const MAX_CHAR_COUNT = 300
const FEED_IMAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_FEED_BUCKET
const TASTE_TAGS = ["여행", "식당", "마트", "카페", "화장품", "자동차", "호텔"]

type SelectedLocation = {
  placeId?: string
  placeName: string
  address: string
  lat: number
  lng: number
  isCustom?: boolean
}

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

const compressImage = async (file: File, maxSize = 1280, quality = 0.82): Promise<File> => {
  const imageBitmap = await createImageBitmap(file)
  const { width, height } = imageBitmap

  const scale = Math.min(1, maxSize / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return file

  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/jpeg", quality)
  )
  if (!blob) return file

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  })
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
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isLocked, isAuthenticated, lockReason, authUser } = useUserAccess(1)

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

  const handleMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("JPG 또는 PNG 파일만 업로드할 수 있어요.")
      return
    }

    if (media?.preview) {
      URL.revokeObjectURL(media.preview)
    }

    // 압축 & 리사이즈하여 업로드 용량 최소화 (원본이 작으면 그대로 사용)
    const compressedFile = await compressImage(file, 1280, 0.82)
    const preview = URL.createObjectURL(compressedFile)
    setMedia({ file: compressedFile, preview })
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

      const userId = authUser?.id
      if (!userId) {
        throw new Error("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.")
      }

      const { error } = await supabase.from("feeds").insert({
        user_id: userId,
        content: body.trim(),
        image_url: uploadedImageUrl,
        category: selectedTag ?? null,
        place_id: location?.placeId ?? null,
        place_name: location?.placeName ?? null,
        address: location?.address ?? null,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        // Additional fields left as defaults (counts, flags, timestamps)
      })

      if (error) {
        throw new Error(error.message ?? "피드를 저장하는 중 오류가 발생했습니다.")
      }

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
                onClick={() => setIsSearchModalOpen(true)}
                disabled={isLocked}
              >
                <Search className="size-5 text-[var(--awave-primary)]" />
                위치 추가하기
              </Button>

              {location && (
                <div className="space-y-3 rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--awave-text)]">{location.placeName}</p>
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
                className={cn(
                  "w-full rounded-xl py-6 text-base font-semibold shadow-lg transition",
                  canSubmit
                    ? "bg-[#223044] text-white hover:bg-[#2f3d66]"
                    : "bg-[var(--awave-text-light)] text-white"
                )}
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

        <SearchLocationModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelect={(loc) => {
            setLocation(loc)
            setIsSearchModalOpen(false)
          }}
        />
      </div>
    </UserLayout>
  )
}
