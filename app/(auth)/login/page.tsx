"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Supabase client (browser)
// Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setEmailError(null)
    setPasswordError(null)

    if (!isValidEmail(email)) {
      setEmailError("등록되지 않은 이메일이에요.")
      setLoading(false)
      return
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error("[login] signInWithPassword error", {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
        })
        const msg = signInError.message?.toLowerCase() ?? ""
        if (signInError.status === 429) {
          setError("로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.")
        } else if (msg.includes("email") && msg.includes("confirm")) {
          setEmailError("등록되지 않은 이메일이거나 잘못된 이메일 입니다.")
        } else if (msg.includes("invalid login credentials") || msg.includes("password")) {
          setPasswordError("이메일 또는 비밀번호가 올바르지 않습니다.")
        } else if (msg.includes("email")) {
          setEmailError("등록되지 않은 이메일이거나 잘못된 이메일 입니다.")
        } else {
          setError("로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.")
        }
        setLoading(false)
        return
      }

      router.push("/feed")
    } catch (err: any) {
      setError(err?.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <UserLayout isLoggedIn={false}>
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md items-center justify-center bg-[var(--awave-bg)] px-4 pb-24 pt-8">
        <Card className="w-full p-6">
          <h2 className="mb-1 text-2xl font-semibold">로그인</h2>
          <p className="mb-3 text-sm text-[var(--awave-text-light)]">로그인 후 계속 awave를 즐겨보세요.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
              {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
            </div>

            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
              {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-[var(--awave-button)] hover:bg-[var(--awave-button)]/90"
              disabled={loading}
            >
              {loading ? "로그인 중…" : "로그인하기"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-[var(--awave-text-light)]">
            계정이 없다면{" "}
            <a href="/signup" className="text-[var(--awave-button)] hover:underline">
              회원가입
            </a>
          </div>
        </Card>
      </div>
    </UserLayout>
  )
}
