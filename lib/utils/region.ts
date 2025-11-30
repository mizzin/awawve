export function normalizeRegion(value: unknown, depth = 0): string[] {
  if (depth > 3) return []

  if (Array.isArray(value)) {
    const flat: string[] = []
    value.forEach((item) => {
      flat.push(...normalizeRegion(item, depth + 1))
    })
    return Array.from(new Set(flat.filter(Boolean).map((item) => `${item}`.trim())))
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      return normalizeRegion(JSON.parse(trimmed), depth + 1)
    } catch {
      return [trimmed]
    }
  }

  return []
}
