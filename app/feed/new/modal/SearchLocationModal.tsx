"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"

type SelectedLocation = {
  placeName: string
  address: string
  lat: number
  lng: number
  isCustom?: boolean
}

type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (location: SelectedLocation) => void
}

const fetchAutocomplete = async (text: string) => {
  if (!text.trim()) return { ok: false, predictions: [] }
  const res = await fetch(`/api/maps/autocomplete?query=${encodeURIComponent(text)}`)
  return res.json().catch(() => ({ ok: false, predictions: [] }))
}

const fetchPlaceDetail = async (placeId: string) => {
  const res = await fetch(`/api/maps/detail?placeId=${encodeURIComponent(placeId)}`)
  return res.json().catch(() => ({ ok: false }))
}

export default function SearchLocationModal({ isOpen, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
      setLoading(false)
    }
  }, [isOpen])

  const handleSearchChange = useCallback(async (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    console.log("[client] query typing:", value)
    setLoading(true)
    const data = await fetchAutocomplete(value)
    console.log("[client] autocomplete response:", data)
    if (data.ok) {
      setResults(data.predictions ?? [])
    } else {
      setResults([])
    }
    setLoading(false)
  }, [])

  const requestLocation = () => {
    setLocationPermissionAsked(true)

    if (!navigator.geolocation) {
      alert("이 기기는 위치 정보를 지원하지 않아요.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        alert("위치 접근이 거부되었어요. 검색은 가능하지만 가까운 순 정렬은 어려워요.")
      }
    )
  }

  const handleSelect = useCallback(
    async (placeId: string) => {
      const data = await fetchPlaceDetail(placeId)
      if (data.ok && data.place) {
        onSelect({
          placeName: data.place.name,
          address: data.place.address,
          lat: data.place.lat,
          lng: data.place.lng,
          isCustom: false,
        })
        onClose()
      }
    },
    [onClose, onSelect]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 px-0 pb-0">
      <button type="button" className="flex-1" aria-label="모달 닫기" onClick={onClose} />
      <div
        className="relative rounded-t-xl bg-white px-5 pb-8 pt-5 shadow-[0_-4px_40px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">장소 검색</p>
            <p className="text-xs text-gray-500">가게 이름, 카페, 장소를 검색해보세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        {!userLocation && (
          <div className="mb-4 rounded-lg bg-gray-100 px-3 py-3 text-sm text-gray-600">
            <p className="mb-2 font-medium text-gray-800">현재 위치를 사용하시겠어요?</p>
            <p className="text-xs text-gray-500">
              위치를 허용하면 “앞에 있는 스타벅스”, “1km 이내 카페” 같은 더 정교한 검색이 가능해요.
            </p>

            <button
              type="button"
              onClick={requestLocation}
              className="mt-3 w-full rounded-md bg-blue-600 py-2 text-xs font-semibold text-white disabled:opacity-60"
              disabled={locationPermissionAsked}
            >
              위치 사용 허용
            </button>
            {locationPermissionAsked && (
              <p className="mt-2 text-xs text-gray-500">위치 권한 요청 중이에요. 기기 알림을 확인해주세요.</p>
            )}
          </div>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => void handleSearchChange(e.target.value)}
          placeholder="스타벅스, 맛집, 카페 검색…"
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />
        {loading && <p className="mt-2 text-xs text-gray-500">검색 중…</p>}
        <div className="mt-2 max-h-60 overflow-y-auto">
          {results.map((p: any) => (
            <button
              key={p.placePrediction.placeId}
              type="button"
              onClick={() => void handleSelect(p.placePrediction.placeId)}
              className="flex w-full flex-col rounded-lg border-b px-3 py-2 text-left hover:bg-gray-100"
            >
              <span className="text-sm font-medium">{p.placePrediction.structuredFormat.mainText.text}</span>
              <span className="text-xs text-gray-500">
                {p.placePrediction.structuredFormat.secondaryText?.text}
              </span>
            </button>
          ))}
          {results.length === 0 && !loading && (
            <p className="mt-2 text-xs text-gray-500">검색 결과가 없습니다.</p>
          )}
        </div>
        <button type="button" onClick={onClose} className="mt-3 text-xs text-gray-500">
          닫기
        </button>
      </div>
    </div>
  )
}
