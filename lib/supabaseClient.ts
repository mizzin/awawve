import { createClient, type SupportedStorage } from "@supabase/supabase-js"

export const SITE_URL = "https://www.tryawave.com"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const storageKey = "awave.auth.session"
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL 또는 공개 키가 설정되지 않았습니다.")
}

if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL !== SITE_URL) {
  throw new Error(`NEXT_PUBLIC_SITE_URL는 ${SITE_URL} 이어야 합니다.`)
}

// LocalStorage-backed storage with a 30-day TTL to keep login-link sessions alive.
const createPersistentStorage = (): SupportedStorage => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }

  return {
    getItem: (key) => {
      const expiresAtRaw = window.localStorage.getItem(`${key}-expiresAt`)
      const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null
      if (expiresAt && Date.now() > expiresAt) {
        window.localStorage.removeItem(key)
        window.localStorage.removeItem(`${key}-expiresAt`)
        return null
      }
      return window.localStorage.getItem(key)
    },
    setItem: (key, value) => {
      window.localStorage.setItem(key, value)
      window.localStorage.setItem(`${key}-expiresAt`, String(Date.now() + THIRTY_DAYS_MS))
    },
    removeItem: (key) => {
      window.localStorage.removeItem(key)
      window.localStorage.removeItem(`${key}-expiresAt`)
    },
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createPersistentStorage(),
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
})
