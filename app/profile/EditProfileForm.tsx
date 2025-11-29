"use client"

import Image from "next/image"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { updateProfile, uploadProfileImage } from "@/lib/profile"
import { generateAvatarSVG, generateAvatarSet } from "@/lib/utils/avatar"

import type { ProfileUser } from "./components/ProfileHeader"

type AvailabilityStatus = "idle" | "checking" | "available" | "duplicate" | "error"
type AvailabilityType = "email" | "nickname"
type ErrorField = "nickname" | "region"

type EditProfileFormProps = {
  user: ProfileUser & { email?: string | null }
  onCancel: () => void
  onSaved: () => Promise<void> | void
}

type AvailabilityResponse = {
  available: boolean
  message?: string
}

async function requestAvailability(type: AvailabilityType, value: string) {
  const response = await fetch("/api/check-availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, value }),
  })

  const payload: AvailabilityResponse = await response.json().catch(() => ({
    available: false,
    message: "중복 확인 응답을 읽을 수 없습니다.",
  }))

  if (!response.ok) {
    throw new Error(payload.message ?? "중복 확인 중 오류가 발생했습니다.")
  }

  return payload
}

const preferenceOptions = ["여행", "식당", "마트", "카페", "화장품", "자동차", "호텔"]
const regionOptions = ["BGC", "Ortigas", "Makati", "Quezon City", "Pasay"]

export function EditProfileForm({ user, onCancel, onSaved }: EditProfileFormProps) {
  const { toast } = useToast()
  const [nickname, setNickname] = useState(user.nickname ?? "")
  const [preferences, setPreferences] = useState<string[]>(user.preferences ?? [])
  const [regions, setRegions] = useState<string[]>(user.regions ?? [])
  const [nicknameCheckStatus, setNicknameCheckStatus] = useState<AvailabilityStatus>("idle")
  const [availabilityMessage, setAvailabilityMessage] = useState<string | undefined>()
  const [errors, setErrors] = useState<Partial<Record<ErrorField, string>>>({})
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl ?? null)

  const originalNickname = useMemo(() => user.nickname ?? "", [user.nickname])
  const generatedAvatar = useMemo(() => generateAvatarSVG(nickname || "?", 80), [nickname])
  const gradientPreviews = useMemo(() => generateAvatarSet(nickname || "?", 64), [nickname])

  useEffect(() => {
    setNickname(user.nickname ?? "")
    setPreferences(user.preferences ?? [])
    setRegions(user.regions ?? [])
    setNicknameCheckStatus("idle")
    setAvailabilityMessage(undefined)
    setErrors({})
    setSelectedFile(null)
    setRemoveImage(false)
    setAvatarPreview(user.avatarUrl ?? null)
  }, [user])

  const validateNickname = (value: string) => /^[가-힣a-zA-Z0-9_]{2,12}$/.test(value)

  const handleNicknameAvailabilityCheck = async () => {
    if (!validateNickname(nickname)) {
      setNicknameCheckStatus("error")
      setErrors((prev) => ({ ...prev, nickname: "닉네임은 2~12자, 한글/영문/숫자/언더바(_)만 사용할 수 있습니다." }))
      return
    }
    setNicknameCheckStatus("checking")
    try {
      const result = await requestAvailability("nickname", nickname)
      if (result.available) {
        setNicknameCheckStatus("available")
        setAvailabilityMessage(result.message ?? "사용 가능한 닉네임입니다.")
        setErrors((prev) => ({ ...prev, nickname: undefined }))
      } else {
        setNicknameCheckStatus("duplicate")
        setAvailabilityMessage(undefined)
        setErrors((prev) => ({ ...prev, nickname: result.message ?? "이미 사용 중인 닉네임입니다." }))
      }
    } catch (error) {
      setNicknameCheckStatus("error")
      setAvailabilityMessage(undefined)
      setErrors((prev) => ({
        ...prev,
        nickname: error instanceof Error ? error.message : "닉네임 중복 확인 중 오류가 발생했습니다.",
      }))
    }
  }

  const handleTogglePreference = (preference: string) => {
    setPreferences((prev) => {
      if (prev.includes(preference)) {
        return prev.filter((item) => item !== preference)
      }
      if (prev.length >= 5) {
        toast({
          title: "취향은 최대 5개까지 선택할 수 있어요.",
          duration: 2000,
          className:
            "rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] text-[var(--awave-text)]",
        })
        return prev
      }
      return [...prev, preference]
    })
  }

  const handleToggleRegion = (region: string) => {
    setRegions((prev) => (prev.includes(region) ? prev.filter((item) => item !== region) : [...prev, region]))
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setRemoveImage(false)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setRemoveImage(true)
    setAvatarPreview(null)
  }

  const handleSave = async () => {
    const nextErrors: Partial<Record<ErrorField, string>> = {}

    if (!validateNickname(nickname)) {
      nextErrors.nickname = "닉네임은 2~12자, 한글/영문/숫자/언더바(_)만 사용할 수 있습니다."
    }

    const nicknameChanged = nickname !== originalNickname
    if (nicknameChanged && nicknameCheckStatus !== "available") {
      nextErrors.nickname = nextErrors.nickname ?? "닉네임 중복 확인을 완료해주세요."
    }

    if (regions.length < 1) {
      nextErrors.region = "관심 지역을 최소 1개 이상 선택해주세요."
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSaving(true)
    try {
      let profileImage: string | null = user.avatarUrl ?? null

      if (removeImage) {
        profileImage = null
      } else if (selectedFile) {
        profileImage = await uploadProfileImage(selectedFile, user.id)
      }

      await updateProfile({
        nickname,
        interest: preferences.slice(0, 5),
        region: regions,
        profile_image: profileImage,
      })
      toast({
        title: "프로필이 업데이트되었습니다.",
        duration: 2500,
        className:
          "rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] text-[var(--awave-text)]",
      })
      await onSaved()
    } catch (error) {
      toast({
        title: "프로필 업데이트에 실패했어요.",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        duration: 2500,
        className: "rounded-xl border border-red-200 bg-red-50 text-red-800",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--awave-text)]">프로필 수정</p>
          <p className="text-sm text-[var(--awave-text-light)]">닉네임, 취향, 관심 지역을 업데이트하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-[var(--awave-text)]">프로필 이미지</p>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--awave-border)] bg-[var(--awave-secondary)]">
            <Image
              src={avatarPreview ?? generatedAvatar}
              alt="프로필 미리보기"
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline">
                이미지 업로드
              </Button>
            </label>
            <Button type="button" variant="outline" onClick={handleRemoveImage}>
              이미지 삭제
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--awave-text-light)]">
            닉네임으로 자동 생성되는 기본 아바타 예시 (6가지 그라데이션)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {gradientPreviews.map((preview, index) => (
              <div
                key={index}
                className={`relative h-16 w-full overflow-hidden rounded-xl border transition ${
                  generatedAvatar === preview ? "border-[var(--awave-button)] ring-2 ring-[var(--awave-button)]" : "border-[var(--awave-border)]"
                }`}
              >
                <Image src={preview} alt="gradient avatar preview" fill className="object-cover" sizes="64px" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname">닉네임</Label>
        <div className="flex items-center gap-2">
          <Input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setNicknameCheckStatus("idle")
              setAvailabilityMessage(undefined)
              setErrors((prev) => ({ ...prev, nickname: undefined }))
            }}
            placeholder="닉네임을 입력하세요"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleNicknameAvailabilityCheck}
            disabled={!nickname || nicknameCheckStatus === "checking" || nickname === originalNickname}
          >
            {nicknameCheckStatus === "checking" ? "확인 중..." : "중복 확인"}
          </Button>
        </div>
        {availabilityMessage && nicknameCheckStatus === "available" && (
          <p className="text-sm text-green-600">{availabilityMessage}</p>
        )}
        {errors.nickname && <p className="text-sm text-red-600">{errors.nickname}</p>}
        <p className="text-xs text-[var(--awave-text-light)]">
          한글/영문/숫자/언더바(_)로 2~12자. 변경 시 중복 확인이 필요합니다.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--awave-text)]">취향 선택 (최대 5개)</p>
        <div className="flex flex-wrap gap-2">
          {preferenceOptions.map((option) => (
            <Button
              key={option}
              type="button"
              variant={preferences.includes(option) ? "default" : "outline"}
              onClick={() => handleTogglePreference(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--awave-text)]">관심 지역 선택 (최소 1개)</p>
        <div className="flex flex-wrap gap-2">
          {regionOptions.map((region) => (
            <Button
              key={region}
              type="button"
              variant={regions.includes(region) ? "default" : "outline"}
              onClick={() => handleToggleRegion(region)}
            >
              {region}
            </Button>
          ))}
        </div>
        {errors.region && <p className="text-sm text-red-600">{errors.region}</p>}
      </div>
    </Card>
  )
}
