import type { ReactNode } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type ProfileUser = {
  id: number
  nickname: string
  email?: string | null
  avatarUrl?: string | null
  preferences: string[]
}

type ProfileHeaderProps = {
  user: ProfileUser
  showEmail?: boolean
  rightSlot?: ReactNode
}

export function ProfileHeader({ user, showEmail, rightSlot }: ProfileHeaderProps) {
  const tags = user.preferences.slice(0, 5)

  return (
    <section className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-[72px]">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.nickname} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-indigo-200 to-sky-100 text-xl font-semibold text-zinc-700">
                {user.nickname.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="space-y-1">
            <p className="text-xl font-semibold text-zinc-900">@{user.nickname}</p>
            {showEmail && user.email ? (
              <p className="text-sm text-zinc-400">{user.email}</p>
            ) : null}
          </div>
        </div>
        {rightSlot}
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#E9F2FF] px-3 py-1 text-sm font-medium text-[#3182F6]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
