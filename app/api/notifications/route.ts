import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

async function createClient(request: Request) {
  const cookieStore = (await cookies()) as any
  const authHeader = request.headers.get("authorization")
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  })
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 30

export async function GET(request: Request) {
  const supabase = await createClient(request)

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

  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get("limit"))
  const limit = Number.isFinite(limitParam)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitParam)))
    : DEFAULT_LIMIT

  const since = new Date(Date.now() - 30 * DAY_MS).toISOString()

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      type,
      reference_id,
      message,
      is_read,
      created_at,
      from_user_id,
      from_user:users!notifications_from_user_id_fkey(id, nickname, profile_image)
    `
    )
    .eq("user_id", user.id)
    .eq("is_hidden", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[api/notifications] fetch error", error)
    return NextResponse.json({ message: "알림을 불러오지 못했습니다." }, { status: 500 })
  }

  const notifications = (data ?? []).map((row: any) => {
    const joinedUser = Array.isArray(row.from_user) ? row.from_user[0] : row.from_user
    return {
      id: row.id,
      type: row.type,
      reference_id: row.reference_id,
      message: row.message,
      is_read: row.is_read,
      created_at: row.created_at,
      from_user: joinedUser
        ? {
            id: joinedUser.id,
            nickname: joinedUser.nickname ?? null,
            profile_image: joinedUser.profile_image ?? null,
          }
        : null,
    }
  })

  return NextResponse.json({ notifications })
}
