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

export async function POST(request: Request) {
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

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .eq("is_hidden", false)
    .select("id")

  if (error) {
    console.error("[api/notifications/read-all] update error", error)
    return NextResponse.json({ message: "알림 읽음 처리에 실패했습니다." }, { status: 500 })
  }

  return NextResponse.json({ updated: data?.length ?? 0 })
}
