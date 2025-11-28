"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabaseClient"
import { useUserAccess } from "@/lib/useUserAccess"

import { ProfileActions } from "../components/ProfileActions"
import { ProfileHeader, type ProfileUser } from "../components/ProfileHeader"

const profileFeeds: FeedCardData[] = []
const profileActions: { label: string; message: string }[] = []
const AUTH_MESSAGES = ["로그인 후 이용해 주세요 🌊", "회원가입 완료하고 함께 즐겨보세요 🌊"] as const
const PROFILE_TABLE = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_TABLE ?? "users"

type ProfileRow = {
  id: string
  email: string | null
  nickname: string | null
  interest?: string[] | string | null
  profile_image?: string | null
}

const normalizePreferences = (raw: ProfileRow["interest"]) => {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export default function MyProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isLocked, lockReason } = useUserAccess(1)
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const showAuthToast = () => {
    const message = AUTH_MESSAGES[Math.floor(Math.random() * AUTH_MESSAGES.length)]
    toast({
      title: message,
      duration: 3000,
      className:
        "rounded-xl border border-[var(--awave-border)] bg-white pr-12 text-[var(--awave-text)] shadow-md",
      action: (
        <ToastAction
          altText="로그인하기"
          onClick={() => router.push("/login")}
          className="h-auto border-none bg-transparent p-0 text-[var(--awave-button)] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-0"
        >
          로그인하기
        </ToastAction>
      ),
    })
  }

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSessionUser(data.session?.user ?? null)
    }
    void syncSession()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setSessionUser(nextUser)
      if (!session) {
        setProfileUser(null)
        toast({
          title: "세션이 만료되어 로그아웃되었습니다.",
          description: "다시 로그인해 주세요.",
          duration: 3000,
          className:
            "rounded-xl border border-[var(--awave-border)] bg-white text-[var(--awave-text)] shadow-md",
        })
        router.replace("/login")
      }
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [router, toast])

  useEffect(() => {
    if (!sessionUser) {
      setProfileUser(null)
      return
    }

    const fetchProfile = async () => {
      setLoadingProfile(true)
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select("id, email, nickname, interest, profile_image")
        .eq("id", sessionUser.id)
        .maybeSingle<ProfileRow>()

      if (error) {
        console.error("Failed to load profile", error)
        toast({
          title: "프로필을 불러오지 못했어요.",
          description: "잠시 후 다시 시도해 주세요.",
          duration: 2500,
          className: "rounded-xl border border-red-200 bg-red-50 text-red-800",
        })
        setProfileUser(null)
        setLoadingProfile(false)
        return
      }

      if (!data) {
        setProfileUser(null)
        setLoadingProfile(false)
        return
      }

      const preferences = normalizePreferences(data.interest)
      setProfileUser({
        id: data.id,
        nickname: data.nickname ?? data.email ?? "awave user",
        email: data.email,
        avatarUrl: data.profile_image ?? null,
        preferences,
      })
      setLoadingProfile(false)
    }

    void fetchProfile()
  }, [sessionUser, toast])

  const handleLogout = async () => {
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()
    setSigningOut(false)
    if (error) {
      toast({
        title: "로그아웃에 실패했어요.",
        description: "잠시 후 다시 시도해 주세요.",
        duration: 2500,
        className: "rounded-xl border border-red-200 bg-red-50 text-red-800",
      })
      return
    }
    router.replace("/feed")
  }

  const isLoggedIn = Boolean(sessionUser) && !isLocked

  return (
    <UserLayout isLoggedIn={isLoggedIn} onRequireAuth={isLocked ? () => alert(lockReason ?? "신고 처리 중입니다.") : showAuthToast}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-24 pt-8">
        {isLocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            신고 접수 상태입니다. 로그인/로그아웃 외에는 차단돼요.
          </div>
        )}
        {loadingProfile ? (
          <div className="rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-10 text-center text-sm text-[var(--awave-text-light)]">
            <p className="font-semibold text-[var(--awave-text)]">프로필 정보를 불러오는 중입니다.</p>
            <p className="mt-1 text-[var(--awave-text-light)]">잠시만 기다려주세요.</p>
          </div>
        ) : profileUser ? (
          <ProfileHeader user={profileUser} showEmail />
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-10 text-center text-sm text-[var(--awave-text-light)]">
            <p className="font-semibold text-[var(--awave-text)]">프로필 정보가 없습니다.</p>
            <p className="mt-1 text-[var(--awave-text-light)]">로그인 후 프로필을 채워주세요.</p>
          </div>
        )}

        {profileUser && profileActions.length > 0 ? <ProfileActions actions={profileActions} /> : null}

        <section className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--awave-text)]">작성한 글</p>
            <p className="text-sm text-[var(--awave-text-light)]">내가 쓴 피드를 모아서 볼 수 있어요.</p>
          </div>
          {profileFeeds.length > 0 ? (
            <div className="space-y-4">
              {profileFeeds.map((feed) => (
                <FeedCard key={feed.id} feed={feed} readOnly={!isLoggedIn} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-8 text-center text-sm text-[var(--awave-text-light)]">
              <p className="font-semibold text-[var(--awave-text)]">작성한 피드가 없습니다.</p>
              <p className="mt-1 text-[var(--awave-text-light)]">첫 피드를 남겨주세요.</p>
            </div>
          )}
        </section>

        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? "로그아웃 중..." : "로그아웃"}
          </Button>
        </div>
      </div>
    </UserLayout>
  )
}
