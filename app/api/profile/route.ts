import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const PROFILE_TABLE = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_TABLE ?? "users"

const normalizeArray = (value: unknown, max?: number) => {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => `${item}`.trim()).filter(Boolean)
    return typeof max === "number" ? cleaned.slice(0, max) : cleaned
  }
  if (typeof value === "string") {
    const parts = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    return typeof max === "number" ? parts.slice(0, max) : parts
  }
  return []
}

function createClient(request: Request) {
  const cookieStore = cookies()
  const authHeader = request.headers.get("authorization")
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set(name, value, options)
        },
        remove(name, options) {
          cookieStore.set(name, "", { ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function GET(request: Request) {
  const supabase = createClient(request)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ message: "세션을 확인할 수 없습니다." }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 })
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("id, email, nickname, interest, region, profile_image")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[api/profile] fetch error", error)
    return NextResponse.json(
      { message: "프로필 정보를 불러오지 못했습니다." },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { message: "프로필이 없습니다." },
      { status: 404 }
    )
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = createClient(request)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ message: "세션을 확인할 수 없습니다." }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const nickname = typeof body.nickname === "string" ? body.nickname : undefined
  const interest = normalizeArray(body.interest, 5)
  const region = normalizeArray(body.region)
  const profile_image =
    body.profile_image === null ? null : typeof body.profile_image === "string" ? body.profile_image : undefined

  const payload: Record<string, any> = {}
  if (nickname !== undefined) payload.nickname = nickname
  if (interest) payload.interest = interest
  if (region) payload.region = region
  if (profile_image !== undefined) payload.profile_image = profile_image

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ message: "업데이트할 항목이 없습니다." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .update(payload)
    .eq("id", user.id)
    .select("id, email, nickname, interest, region, profile_image")
    .maybeSingle()

  if (error) {
    console.error("[api/profile] update error", error)
    return NextResponse.json(
      { message: error.message ?? "프로필 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
