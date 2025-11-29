import type { ReactNode } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { generateAvatarSVG } from "@/lib/utils/avatar"

export type ProfileUser = {
  id: string
  nickname: string
  email?: string | null
  avatarUrl?: string | null
  preferences: string[]
  regions?: string[]
}

type ProfileHeaderProps = {
  user: ProfileUser
  showEmail?: boolean
  rightSlot?: ReactNode
}

export function ProfileHeader({ user, showEmail, rightSlot }: ProfileHeaderProps) {
  const tags = user.preferences.slice(0, 5)
  const avatarSrc = user.avatarUrl ?? generateAvatarSVG(user.nickname, 72)

  return (
    <section className="rounded-xl border border-[var(--awave-border)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-[72px]">
            <AvatarImage src={avatarSrc} alt={user.nickname} className="object-cover" />
            <AvatarFallback className="bg-[var(--awave-secondary)] text-xl font-semibold text-[var(--awave-text)]">
              {user.nickname.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-xl font-semibold text-[var(--awave-text)]">@{user.nickname}</p>
            {showEmail && user.email ? <p className="text-sm text-[var(--awave-text-light)]">{user.email}</p> : null}
          </div>
        </div>
        {rightSlot}
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--awave-secondary)] px-3 py-1 text-sm font-medium text-[var(--awave-primary)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
