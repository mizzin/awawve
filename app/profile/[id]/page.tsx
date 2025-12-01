"use client"

import { useRouter } from "next/navigation"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { useUserAccess } from "@/lib/useUserAccess"

export default function OtherProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { isLocked, isAuthenticated, lockReason } = useUserAccess(1)

  const handleBlocked = () => {
    alert(lockReason ?? "신고 확인 중이라 이용이 제한됩니다.")
  }

  return (
    <UserLayout isLoggedIn={isAuthenticated && !isLocked} onRequireAuth={handleBlocked}>
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 pb-24 pt-8">
        <div className="rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-6 text-center text-sm text-[var(--awave-text)]">
          <p className="font-semibold">프로필 페이지가 준비 중입니다.</p>
          <p className="mt-1 text-[var(--awave-text-light)]">ID {params.id} 프로필은 곧 제공될 예정이에요.</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/feed")}>
            피드로 돌아가기
          </Button>
        </div>
      </div>
    </UserLayout>
  )
}
