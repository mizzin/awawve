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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // On success, navigate to dashboard (or desired protected route)
      router.push("/dashboard")
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
          <p className="mb-6 text-sm text-[var(--awave-text-light)]">로그인 후 계속 awave를 즐겨보세요.</p>

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
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중…" : "로그인하기"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-[var(--awave-text-light)]">
            계정이 없다면{" "}
            <a href="/signup" className="text-[var(--awave-primary)] hover:underline">
              회원가입
            </a>
          </div>
        </Card>
      </div>
    </UserLayout>
  )
}
