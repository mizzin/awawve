import { supabase } from "./supabaseClient"

export type ProfileResponse = {
  id: string
  email: string | null
  nickname: string | null
  interest: string[] | null
  region: string[] | null
  profile_image: string | null
}

export async function getProfile() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const response = await fetch("/api/profile", {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error((payload as any)?.message ?? "프로필 정보를 불러오지 못했습니다.")
  }
  return (await response.json()) as ProfileResponse
}

export async function updateProfile(payload: {
  nickname: string
  interest: string[]
  region: string[]
  profile_image: string | null
}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error((result as any)?.message ?? "프로필 업데이트에 실패했습니다.")
  }

  return (await response.json()) as ProfileResponse
}

export async function uploadProfileImage(file: File, userId: string) {
  const ext = file.name.split(".").pop() || "png"
  const filePath = `${userId}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    })

  if (error || !data?.path) {
    throw error ?? new Error("이미지 업로드에 실패했습니다.")
  }

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(data.path)
  if (!publicUrl?.publicUrl) {
    throw new Error("업로드한 이미지의 URL을 가져오지 못했습니다.")
  }

  return publicUrl.publicUrl
}
