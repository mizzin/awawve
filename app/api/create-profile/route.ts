import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcrypt"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const profileTable = process.env.SUPABASE_PROFILE_TABLE ?? "users"

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase 서비스 키 또는 URL이 설정되지 않았습니다.")
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

type CreateProfileBody = {
  id?: string
  email?: string
  nickname?: string
  password?: string
  interest?: string[] | string | null
  region?: string[] | string | null
  is_active?: boolean
  is_blocked?: boolean
  profile_image?: string | null
}

function toStringArray(value: CreateProfileBody["interest"]) {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function toStringValue(value: CreateProfileBody["region"]) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean).join(",")
  }
  if (typeof value === "string") {
    return value.trim()
  }
  return ""
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProfileBody
    const { id, email, nickname, password } = body

    if (!id || !email || !nickname || !password) {
      return NextResponse.json(
        { message: "필수 필드(id, email, nickname, password)를 모두 입력해주세요." },
        { status: 400 }
      )
    }

    const interest = toStringArray(body.interest)
    const region = toStringValue(body.region)
    const passwordHash = await bcrypt.hash(password, 10)

    const insertPayload = {
      id,
      email,
      nickname,
      password: passwordHash,
      interest,
      region: region || null,
      is_active: body.is_active ?? true,
      is_blocked: body.is_blocked ?? false,
      profile_image: body.profile_image ?? null,
    }

    console.log("[create-profile] incoming", {
      id,
      email,
      nickname,
      interestCount: interest.length,
      region: region || null,
      table: profileTable,
    })

    const { error } = await supabaseAdmin.from(profileTable).insert(insertPayload)

    if (error) {
      console.error("[create-profile] insert error", {
        message: error.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      })
      return NextResponse.json(
        { message: error.message || "프로필 생성 중 오류가 발생했습니다." },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "프로필 생성 완료" })
  } catch (error) {
    console.error("Create profile route error:", error)
    return NextResponse.json({ message: "프로필 생성 요청을 처리할 수 없습니다." }, { status: 500 })
  }
}
