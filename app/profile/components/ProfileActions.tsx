"use client"

import { Button } from "@/components/ui/button"

type ProfileAction = {
  label: string
  message: string
}

type ProfileActionsProps = {
  actions: ProfileAction[]
}

export function ProfileActions({ actions }: ProfileActionsProps) {
  return (
    <section className="grid gap-3">
      {actions.map((item) => (
        <Button
          key={item.label}
          type="button"
          variant="outline"
          className="justify-start rounded-xl border-[var(--awave-border)] bg-white py-6 text-base font-medium text-[var(--awave-text)] hover:bg-[var(--awave-secondary)]"
          onClick={() => alert(item.message)}
        >
          {item.label}
        </Button>
      ))}
    </section>
  )
}
