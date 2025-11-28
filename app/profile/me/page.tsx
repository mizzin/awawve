/** @jsxImportSource react */
"use client"

import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import UserLayout from "@/app/layout/UserLayout"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useUserAccess } from "@/lib/useUserAccess"
import { useRouter } from "next/navigation"

import { ProfileActions } from "../components/ProfileActions"
import { ProfileHeader, type ProfileUser } from "../components/ProfileHeader"

const profileUser: ProfileUser | null = null
const profileFeeds: FeedCardData[] = []
const profileActions: { label: string; message: string }[] = []
const AUTH_MESSAGES = ["로그인 후 이용해 주세요 🌊", "회원가입 완료하고 함께 즐겨보세요 🌊"] as const

export default function MyProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isLocked, lockReason } = useUserAccess(1)

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

  const isLoggedIn = !isLocked

  return (
    <UserLayout isLoggedIn={isLoggedIn} onRequireAuth={isLocked ? () => alert(lockReason ?? "신고 처리 중입니다.") : showAuthToast}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-24 pt-8">
        {isLocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            신고 접수 상태입니다. 로그인/로그아웃 외에는 차단돼요.
          </div>
        )}
        {profileUser ? (
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
      </div>
    </UserLayout>
  )
}
