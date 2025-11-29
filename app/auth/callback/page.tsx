"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import UserLayout from "@/app/layout/UserLayout"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"

type Status = "checking" | "error"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>("checking")
  const [message, setMessage] = useState("세션을 확인하고 있어요...")

  useEffect(() => {
    let active = true
    const handleSession = async () => {
      const nextParam = searchParams.get("next")
      const redirectTarget = nextParam === "/home" ? "/home" : "/feed"

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }

        let session = data.session

        if (!session) {
          const exchange = await supabase.auth.exchangeCodeForSession(window.location.href)

          if (exchange.error) {
            throw exchange.error
          }

          session = exchange.data.session
        }

        if (!session) {
          throw new Error("세션 정보를 확인할 수 없습니다.")
        }

        if (!active) return
        router.replace(redirectTarget)
      } catch (err: any) {
        console.error("[auth/callback] session check failed", err)
        if (!active) return
        setStatus("error")
        setMessage(
          err?.message ??
            "매직링크 인증에 실패했어요. 링크가 만료되었거나 이미 사용된 것일 수 있습니다."
        )
      }
    }

    void handleSession()

    return () => {
      active = false
    }
  }, [router, searchParams])

  return (
    <UserLayout isLoggedIn={false}>
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md items-center justify-center bg-[var(--awave-bg)] px-4 pb-24 pt-10">
        <Card className="w-full p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold">로그인 확인 중</h2>
          <p className="text-sm text-[var(--awave-text-light)]">
            {status === "checking"
              ? "매직링크를 확인하고 있습니다. 잠시만 기다려주세요."
              : message}
          </p>
          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">
              {message || "세션을 불러오지 못했습니다. 새로운 매직링크를 요청해주세요."}
            </p>
          )}
        </Card>
      </div>
    </UserLayout>
  )
}
