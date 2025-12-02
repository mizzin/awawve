"use client"

import { ChangeEvent, FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
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
const DEFAULT_MAP_CENTER = { lat: 14.5534, lng: 121.0445 } // BGC 기본 좌표

type SelectedLocation = {
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

const loadGoogleMaps = (apiKey?: string) =>
  new Promise<any | null>((resolve) => {
    console.log("[maps] load start", apiKey ? "has-key" : "no-key")
    if (typeof window === "undefined") return resolve(null)
    const w = window as typeof window & { google?: any }
    if (w.google?.maps) {
      console.log("[maps] already loaded")
      return resolve(w.google)
    }
    if (!apiKey) {
      console.warn("[maps] missing api key")
      return resolve(null)
    }

    const existing = document.getElementById("google-maps-sdk") as HTMLScriptElement | null
    if (existing) {
      if ((window as any).google?.maps) {
        console.log("[maps] existing script and google present")
        return resolve((window as any).google)
      }
      existing.addEventListener("load", () => {
        console.log("[maps] existing script load event")
        resolve((window as any).google ?? null)
      })
      existing.addEventListener("error", () => {
        console.error("[maps] existing script load error")
        resolve(null)
      })
      // 방어: 이미 로드됐는데 google이 없는 경우도 즉시 종료
      setTimeout(() => resolve((window as any).google ?? null), 0)
      return
    }

    const script = document.createElement("script")
    script.id = "google-maps-sdk"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => {
      console.log("[maps] script loaded")
      resolve((window as any).google ?? null)
    }
    script.onerror = () => {
      console.error("[maps] script load error")
      resolve(null)
    }
    document.head.appendChild(script)
  })

const fetchAutocomplete = async (text: string) => {
  if (!text.trim()) {
    setSearchResults([])
    return
  }
  setIsSearching(true)

  const res = await fetch(`/api/maps/autocomplete?query=${text}`)
  const data = await res.json()

  if (data.ok) {
    setSearchResults(data.predictions)
  }

  setIsSearching(false)
}

const selectPlace = async (placeId: string) => {
  const res = await fetch(`/api/maps/detail?placeId=${placeId}`)
  const data = await res.json()

  if (data.ok && data.place) {
    onSelect({
      placeName: data.place.name,
      address: data.place.address,
      lat: data.place.lat,
      lng: data.place.lng,
      isCustom: false
    })

    setShowSearchBox(false)        // 검색창 닫기
    setSearchQuery("")
    setSearchResults([])
  }
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
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [location, setLocation] = useState<SelectedLocation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchBox, setShowSearchBox] = useState(false)
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

  const fetchAutocomplete = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const res = await fetch(`/api/maps/autocomplete?query=${encodeURIComponent(text)}`)
        const data = await res.json()
        if (data.ok) {
          setSearchResults(data.predictions)
        }
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  const selectPlace = useCallback(
    async (placeId: string, onSelect: (loc: SelectedLocation) => void) => {
      const res = await fetch(`/api/maps/detail?placeId=${encodeURIComponent(placeId)}`)
      const data = await res.json()

      if (data.ok && data.place) {
        const loc: SelectedLocation = {
          placeName: data.place.name,
          address: data.place.address,
          lat: data.place.lat,
          lng: data.place.lng,
          isCustom: false,
        }
        onSelect(loc)
        setShowSearchBox(false)
        setSearchQuery("")
        setSearchResults([])
      }
    },
    []
  )

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

        {isLocationModalOpen && (
          <LocationModal
            selectedLocation={location}
            onClose={() => setIsLocationModalOpen(false)}
            isOpen={isLocationModalOpen}
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
  isOpen: boolean
  onSelect: (location: SelectedLocation) => void
  onClose: () => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  searchResults: any[]
  setSearchResults: (value: any[]) => void
  isSearching: boolean
  showSearchBox: boolean
  setShowSearchBox: (value: boolean) => void
  fetchAutocomplete: (text: string) => Promise<void>
  selectPlace: (placeId: string, onSelect: (loc: SelectedLocation) => void) => Promise<void>
}

function LocationModal({
  selectedLocation,
  onClose,
  onSelect,
  isOpen,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  isSearching,
  showSearchBox,
  setShowSearchBox,
  fetchAutocomplete,
  selectPlace,
}: LocationModalProps) {
  const [query, setQuery] = useState("")
  const [pinLocation, setPinLocation] = useState<SelectedLocation | null>(() =>
    selectedLocation?.isCustom ? selectedLocation : null
  )
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const mapsLoadedRef = useRef(false)
  const mountedRef = useRef(false)

  const initializeMap = async () => {
    if (mapsLoadedRef.current || !mapRef.current) {
      return
    }
    const google = await loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
    if (!google) {
      return
    }
    const center = selectedLocation
      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
      : DEFAULT_MAP_CENTER

    let map: any = null
    try {
      map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        clickableIcons: true,
      })
    } catch (err) {
      console.error("[maps] map init error", err)
      return
    }

    mapInstanceRef.current = map
    const placeMarker = (lat: number, lng: number, label?: string) => {
      const position = { lat, lng }
      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          position,
          map,
        })
      } else {
        markerRef.current.setPosition(position)
      }
      map.panTo(position)
      const text = label?.trim()
      const nextLocation: SelectedLocation = {
        placeName: text || "사용자 지정 위치",
        address: text || "핀으로 지정한 위치",
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        isCustom: true,
      }
      setPinLocation(nextLocation)
      return nextLocation
    }

    if (selectedLocation) {
      const loc = placeMarker(selectedLocation.lat, selectedLocation.lng, selectedLocation.address)
      if (loc) {
        onSelect(loc)
      }
    }

    map.addListener("click", async (event: any) => {
      const latFromEvent = event?.latLng?.lat?.()
      const lngFromEvent = event?.latLng?.lng?.()
      const placeId = event?.placeId

      if (placeId) {
        if (event.stop) event.stop()
        try {
          const paramLat = latFromEvent !== undefined ? `&lat=${latFromEvent}` : ""
          const paramLng = lngFromEvent !== undefined ? `&lng=${lngFromEvent}` : ""
          const res = await fetch(`/api/maps/place?placeId=${placeId}${paramLat}${paramLng}`)
          const data = await res.json()
          if (data?.place) {
            const placeName = data.place.name || "사용자 지정 위치"
            const address = data.place.address || "주소 없음"
            const lat = data.place.lat ?? latFromEvent
            const lng = data.place.lng ?? lngFromEvent
            if (lat !== undefined && lng !== undefined) {
              placeMarker(lat, lng, placeName)
              onSelect({
                placeName,
                address,
                lat: Number(lat.toFixed(6)),
                lng: Number(lng.toFixed(6)),
                isCustom: false,
              })
              onClose()
              return
            }
          }
        } catch (error) {
          console.error("[maps] place detail fetch error", error)
        }
        // placeId 처리 실패 시 lat/lng로 계속 진행
      }

      if (latFromEvent === undefined || lngFromEvent === undefined) {
        console.warn("[maps] no lat/lng from event")
        return
      }

      const lat = latFromEvent
      const lng = lngFromEvent
      console.log("[maps] normal click", lat, lng)

      try {
        const res = await fetch(`/api/maps/place?lat=${lat}&lng=${lng}`)
        const data = await res.json()

        const placeName = data?.place?.name || "사용자 지정 위치"
        const address = data?.address || data?.place?.vicinity || "주소 없음"

        placeMarker(lat, lng, placeName)

        onSelect({
          placeName,
          address,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          isCustom: false,
        })
        onClose()
      } catch (error) {
        console.error("[maps] place fetch error", error)
      }
    })


    mapInstanceRef.current = map
    mapsLoadedRef.current = true
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
      mapsLoadedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const timer = setTimeout(() => {
      if (!mountedRef.current) return
      void initializeMap()
    }, 60)
    return () => {
      clearTimeout(timer)
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
      mapsLoadedRef.current = false
    }
  }, [isOpen])

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

        <div className="relative pointer-events-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--awave-text-light)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="장소를 검색해보세요"
            className="pointer-events-auto w-full rounded-xl border-[var(--awave-border)] bg-[var(--awave-secondary)] pl-10 pr-4 text-sm text-[var(--awave-text)]"
          />
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => setShowSearchBox(true)}
            className="w-full rounded-xl border px-4 py-3 text-left text-sm bg-[var(--awave-secondary)]"
          >
            🔍 장소 이름으로 검색하기
          </button>

          {showSearchBox && (
            <div className="mt-4 rounded-xl border bg-white p-4 shadow-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  void fetchAutocomplete(e.target.value)
                }}
                placeholder="스타벅스, 맛집, 카페 검색…"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              {isSearching && <p className="mt-2 text-xs text-gray-500">검색 중…</p>}
              <div className="mt-2 max-h-60 overflow-y-auto">
                {searchResults.map((p: any) => (
                  <div
                    key={p.placePrediction.placeId}
                    onClick={() => void selectPlace(p.placePrediction.placeId, onSelect)}
                    className="cursor-pointer rounded-lg border-b px-3 py-2 hover:bg-gray-100"
                  >
                    <p className="text-sm font-medium">{p.placePrediction.structuredFormat.mainText.text}</p>
                    <p className="text-xs text-gray-500">
                      {p.placePrediction.structuredFormat.secondaryText?.text}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowSearchBox(false)}
                className="mt-3 text-xs text-gray-500"
              >
                닫기
              </button>
            </div>
          )}

          <div className="relative flex h-56 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)]">
            <div ref={mapRef} className="absolute inset-0" />
            {!pinLocation && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-white/40 via-white/20 to-transparent text-sm font-medium text-[var(--awave-text-light)] pointer-events-none">
                터치해서 핀 놓기
                <span className="mt-1 text-[10px]">BGC 기준 지도</span>
              </div>
            )}
          </div>
          {pinLocation && (
            <div className="rounded-xl bg-[var(--awave-secondary)] p-3 text-sm text-[var(--awave-text)]">
              <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold text-[var(--awave-text)]">{pinLocation.placeName}</p>
                    <p className="text-xs text-[var(--awave-text-light)]">{pinLocation.address}</p>
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
          {/* 🔍 장소 검색 버튼 */}
<button
  type="button"
  onClick={() => setShowSearchBox(true)}
  className="w-full rounded-xl border px-4 py-3 text-left text-sm bg-[var(--awave-secondary)]">
  🔍 장소 이름으로 검색하기
</button>


{/* 🔍 장소 검색 모달 UI */}
{showSearchBox && (
  <div className="mt-4 rounded-xl border bg-white p-4 shadow-md">
    
    {/* 검색 입력창 */}
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value)
        fetchAutocomplete(e.target.value)      // 자동완성 실행
      }}
      placeholder="스타벅스, 맛집, 카페 검색…"
      className="w-full rounded-xl border px-3 py-2 text-sm"
    />

    {/* 로딩 표시 */}
    {isSearching && (
      <p className="mt-2 text-xs text-gray-500">검색 중…</p>
    )}

    {/* 검색 결과 리스트 */}
    <div className="mt-2 max-h-60 overflow-y-auto">
      {searchResults.map((p: any) => (
        <div
          key={p.placePrediction.placeId}
          onClick={() => selectPlace(p.placePrediction.placeId)}
          className="cursor-pointer rounded-lg px-3 py-2 hover:bg-gray-100 border-b"
        >
          <p className="text-sm font-medium">
            {p.placePrediction.structuredFormat.mainText.text}
          </p>
          <p className="text-xs text-gray-500">
            {p.placePrediction.structuredFormat.secondaryText?.text}
          </p>
        </div>
      ))}
    </div>

    {/* 닫기 */}
    <button
      type="button"
      onClick={() => setShowSearchBox(false)}
      className="mt-3 text-xs text-gray-500"
    >
      닫기
    </button>

  </div>
)}

        </div>

      </div>
    </div>
  )
}
