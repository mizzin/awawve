"use client"

import { useEffect, useRef, useState } from "react"

import FeedCard, { type FeedCardData } from "@/app/feed/components/FeedCard"
import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { useUserAccess } from "@/lib/useUserAccess"

import { ProfileHeader, type ProfileUser } from "../components/ProfileHeader"

const otherProfile: ProfileUser = {
  id: "7",
  nickname: "traveler_j",
  email: null,
  avatarUrl: "https://i.pravatar.cc/150?img=12",
  preferences: ["여행", "맛집", "사진", "러닝"],
}

const otherFeeds: FeedCardData[] = [
  {
    id: 201,
    author: { nickname: "traveler_j", handle: "@traveler_j", avatarUrl: otherProfile.avatarUrl },
    content: "벚꽃 시즌의 도쿄는 언제 와도 설레네요. 메구로강 산책 추천!",
    imageUrl: "https://images.unsplash.com/photo-1479705879471-5aea6293710f?auto=format&fit=crop&w=900&q=80",
    createdAt: "2025-03-20T06:03:00Z",
    commentCount: 18,
    reactions: { like: 54, funny: 7, dislike: 1 },
  },
  {
    id: 202,
    author: { nickname: "traveler_j", handle: "@traveler_j", avatarUrl: otherProfile.avatarUrl },
    content: "서울숲 러닝 코스 공유합니다. 밤에도 조명이 좋아요!",
    imageUrl: null,
    createdAt: "2025-03-15T20:45:00Z",
    commentCount: 6,
    reactions: { like: 22, funny: 2, dislike: 0 },
  },
]

export default function OtherProfilePage() {
  const { isLocked, isAuthenticated, lockReason } = useUserAccess(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleOutside(event: MouseEvent | TouchEvent) {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) {
        return
      }
      setMenuOpen(false)
    }

    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("touchstart", handleOutside)

    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("touchstart", handleOutside)
    }
  }, [])

  const handleBlocked = () => {
    alert(lockReason ?? "신고 확인 중이라 이용이 제한됩니다.")
  }

  return (
    <UserLayout isLoggedIn={isAuthenticated && !isLocked} onRequireAuth={handleBlocked}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-24 pt-8">
        {isLocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            신고 접수 상태입니다. 로그인/로그아웃 외에는 차단돼요.
          </div>
        )}
        <ProfileHeader
          user={otherProfile}
          rightSlot={
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-full border-[var(--awave-border)]"
                onClick={() => {
                  if (isLocked) {
                    handleBlocked()
                    return
                  }
                  setMenuOpen((prev) => !prev)
                }}
                aria-label="프로필 옵션"
              >
                ⋯
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-32 rounded-2xl border border-[var(--awave-border)] bg-white py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-[#d14343] hover:bg-[var(--awave-secondary)]"
                    onClick={() => {
                      if (isLocked) {
                        handleBlocked()
                        return
                      }
                      alert("신고가 접수되었습니다.")
                      setMenuOpen(false)
                    }}
                  >
                    신고
                  </button>
                </div>
              )}
            </div>
          }
        />

        <section className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--awave-text)]">공개된 글</p>
            <p className="text-sm text-[var(--awave-text-light)]">이 사용자가 공유한 피드입니다.</p>
          </div>
          <div className="space-y-4">
            {otherFeeds.map((feed) => (
              <FeedCard key={feed.id} feed={feed} readOnly={isLocked} onRequireAuth={handleBlocked} />
            ))}
          </div>
        </section>
      </div>
    </UserLayout>
  )
}
