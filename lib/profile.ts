import { supabase } from "./supabaseClient"

const PROFILE_TABLE = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_TABLE ?? "users"

type UpdateProfileParams = {
  userId: string
  nickname: string
  interest: string[]
  region: string[]
}

export async function updateProfile({ userId, nickname, interest, region }: UpdateProfileParams) {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .update({ nickname, interest, region })
    .eq("id", userId)
    .select("id, email, nickname, interest, region, profile_image")
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
