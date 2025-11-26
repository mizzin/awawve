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
          className="justify-start rounded-2xl border-zinc-200 bg-white py-6 text-base font-medium text-zinc-700"
          onClick={() => alert(item.message)}
        >
          {item.label}
        </Button>
      ))}
    </section>
  )
}
