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
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md items-center justify-center px-4 pb-24 pt-8">
        <Card className="w-full p-6">
          <h2 className="mb-1 text-2xl font-semibold">Sign in</h2>
          <p className="mb-6 text-sm text-gray-500">Use your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
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
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            Don’t have an account?{" "}
            <a href="/signup" className="text-blue-600 hover:underline">
              Create one
            </a>
          </div>
        </Card>
      </div>
    </UserLayout>
  )
}
