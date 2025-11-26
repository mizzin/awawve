import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import UserLayout from "@/app/layout/UserLayout"

import { ProfileActions } from "../components/ProfileActions"
import { ProfileHeader, type ProfileUser } from "../components/ProfileHeader"

const myProfile: ProfileUser = {
  id: 1,
  nickname: "wave_maker",
  email: "wave@example.com",
  avatarUrl: "https://i.pravatar.cc/150?img=23",
  preferences: ["카페", "여행", "드라이브", "필름", "서핑"],
}

const myFeeds: FeedCardData[] = [
  {
    id: 101,
    author: { nickname: "wave_maker", handle: "@wave_maker", avatarUrl: myProfile.avatarUrl },
    content: "고흥에서 파도 타고 돌아왔어요. 잔잔한 물색이 아직도 머릿속에 남아 있네요.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
    createdAt: "2025-02-14T05:21:00Z",
    commentCount: 8,
    reactions: { like: 24, funny: 3, dislike: 0 },
  },
  {
    id: 102,
    author: { nickname: "wave_maker", handle: "@wave_maker", avatarUrl: myProfile.avatarUrl },
    content: "새로 산 필름카메라 테스트. 노출값 잡는 게 아직도 어렵네요.",
    imageUrl: null,
    createdAt: "2025-02-10T11:00:00Z",
    commentCount: 2,
    reactions: { like: 10, funny: 1, dislike: 0 },
  },
]

export default function MyProfilePage() {
  const profileActions = [
    { label: "✏️ 프로필 수정", message: "프로필 수정 준비 중입니다." },
    { label: "🔒 비밀번호 변경", message: "비밀번호 변경 준비 중입니다." },
    { label: "🚪 로그아웃", message: "로그아웃 되었습니다." },
  ]

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-24 pt-8">
        <ProfileHeader user={myProfile} showEmail />

        <ProfileActions actions={profileActions} />

        <section className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-zinc-900">작성한 글</p>
            <p className="text-sm text-zinc-400">내가 쓴 피드를 모아서 볼 수 있어요.</p>
          </div>
          <div className="space-y-4">
            {myFeeds.map((feed) => (
              <FeedCard key={feed.id} feed={feed} />
            ))}
          </div>
        </section>
      </div>
    </UserLayout>
  )
}
