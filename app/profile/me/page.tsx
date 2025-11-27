import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import UserLayout from "@/app/layout/UserLayout"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
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

  const showAuthToast = () => {
    const message = AUTH_MESSAGES[Math.floor(Math.random() * AUTH_MESSAGES.length)]
    toast({
      title: message,
      duration: 3000,
      className: "rounded-xl border border-zinc-100 bg-white text-gray-700 shadow-md",
      action: (
        <ToastAction altText="로그인 하러가기" onClick={() => router.push("/login")}>
          로그인 하러가기
        </ToastAction>
      ),
    })
  }

  const isLoggedIn = false

  return (
    <UserLayout isLoggedIn={isLoggedIn} onRequireAuth={showAuthToast}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-24 pt-8">
        {profileUser ? (
          <ProfileHeader user={profileUser} showEmail />
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
            <p className="font-semibold text-zinc-700">프로필 정보가 없습니다.</p>
            <p className="mt-1 text-zinc-500">로그인 후 프로필을 채워주세요.</p>
          </div>
        )}

        {profileUser && profileActions.length > 0 ? <ProfileActions actions={profileActions} /> : null}

        <section className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-zinc-900">작성한 글</p>
            <p className="text-sm text-zinc-400">내가 쓴 피드를 모아서 볼 수 있어요.</p>
          </div>
          {profileFeeds.length > 0 ? (
            <div className="space-y-4">
              {profileFeeds.map((feed) => (
                <FeedCard key={feed.id} feed={feed} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
              <p className="font-semibold text-zinc-700">작성한 피드가 없습니다.</p>
              <p className="mt-1 text-zinc-500">첫 피드를 남겨주세요.</p>
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  )
}
