"use client"

import { supabase } from "@/lib/supabaseClient"

export type NotificationType = "comment" | "reaction"

type NotificationInput = {
  userId: string | null | undefined
  fromUserId: string | null | undefined
  type: NotificationType
  referenceId: string
  message: string
}

const ONE_MINUTE_MS = 60 * 1000

const truncateText = (text: string, maxLength = 10) => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(1, maxLength)).trim()}…`
}

export const buildReactionMessage = (reaction: "like" | "funny" | "dislike") => {
  const labels = {
    like: "좋아요",
    funny: "ㅋㅋㅋ",
    dislike: "별로야",
  }
  return `${labels[reaction]} 반응을 남겼어요.`
}

export const buildCommentMessage = (content: string) => {
  const trimmed = content.trim()
  if (!trimmed) return "새 댓글이 달렸어요."
  return `새 댓글이 달렸어요: ${truncateText(trimmed)}`
}

export async function createOrUpdateNotification(input: NotificationInput) {
  if (!input.userId || !input.fromUserId) return
  if (input.userId === input.fromUserId) return

  const now = new Date()
  const recentSince = new Date(Date.now() - ONE_MINUTE_MS).toISOString()

  const { data: recent, error: fetchError } = await supabase
    .from("notifications")
    .select("id, created_at")
    .eq("user_id", input.userId)
    .eq("from_user_id", input.fromUserId)
    .eq("type", input.type)
    .eq("reference_id", input.referenceId)
    .gte("created_at", recentSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    console.error("[notifications] fetch recent error", fetchError)
  }

  if (recent?.id) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        message: input.message,
        is_read: false,
        created_at: now.toISOString(),
        is_hidden: false,
      })
      .eq("id", recent.id)

    if (updateError) {
      console.error("[notifications] update error", updateError)
    }
    return
  }

  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: input.userId,
    from_user_id: input.fromUserId,
    type: input.type,
    reference_id: input.referenceId,
    message: input.message,
  })

  if (insertError) {
    console.error("[notifications] insert error", insertError)
  }
}

export async function deleteReactionNotification({
  userId,
  fromUserId,
  referenceId,
}: {
  userId: string | null | undefined
  fromUserId: string | null | undefined
  referenceId: string
}) {
  if (!userId || !fromUserId) return
  if (userId === fromUserId) return

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("from_user_id", fromUserId)
    .eq("type", "reaction")
    .eq("reference_id", referenceId)

  if (error) {
    console.error("[notifications] delete reaction error", error)
  }
}
