import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL/ANON_KEY를 확인하세요.")
}

async function createClient(request: Request) {
  const cookieStore = (await cookies()) as any
  const authHeader = request.headers.get("authorization")
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined

  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
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

export async function GET(request: Request) {
  const supabase = await createClient(request)

  const maskUserId = (userId: string | null) => (userId ? `익명-${userId.slice(0, 4)}` : "익명")
  const resolveNickname = (nickname: string | null | undefined, userId: string | null) =>
    nickname?.trim() || maskUserId(userId)

  const { data, error } = await supabase
    .from("feeds")
    .select(
      "id, user_id, content, image_url, created_at, users:users!feeds_user_id_fkey(id, nickname, profile_image)"
    )
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[api/feeds] fetch error", error)
    return NextResponse.json({ message: "피드를 불러오지 못했습니다." }, { status: 500 })
  }

  const feeds = (data ?? []).map((row) => {
    const joinedUser = Array.isArray((row as any).users) ? (row as any).users[0] : (row as any).users
    const nickname = resolveNickname(joinedUser?.nickname, (row as any).user_id)
    const profileImage = joinedUser?.profile_image ?? null

    return {
      ...row,
      users: joinedUser ? { ...joinedUser, nickname, profile_image: profileImage } : null,
      author_nickname: nickname,
      author_profile_image: profileImage,
    }
  })

  return NextResponse.json({ feeds })
}
