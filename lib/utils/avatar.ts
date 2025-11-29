const gradients = [
  { start: "#223044", end: "#3182F6" }, // Navy → Blue
  { start: "#6A4DF5", end: "#F067B4" }, // Purple → Pink
  { start: "#8EB7FF", end: "#1E2633" }, // Sky → Navy
  { start: "#7EE5D6", end: "#168B8F" }, // Mint → Teal
  { start: "#FFB673", end: "#FF6E6C" }, // Orange → Coral
  { start: "#C6F68D", end: "#4BB543" }, // Lime → Green
]

const base64Encode = (value: string) => {
  if (typeof window === "undefined") {
    return Buffer.from(value).toString("base64")
  }
  return btoa(unescape(encodeURIComponent(value)))
}

const pickGradientIndex = (nickname: string, override?: number) => {
  if (typeof override === "number") {
    return Math.abs(override) % gradients.length
  }
  let hash = 0
  for (const char of Array.from(nickname)) {
    hash = (hash + char.codePointAt(0)! * 31) % 2147483647
  }
  return Math.abs(hash) % gradients.length
}

export function generateAvatarSVG(nickname: string, size = 80, gradientIndexOverride?: number) {
  const cleaned = nickname?.trim() ?? ""
  const firstLetter = cleaned ? Array.from(cleaned)[0] ?? "?" : "?"
  const gradientIndex = pickGradientIndex(cleaned || "awave", gradientIndexOverride)
  const gradient = gradients[gradientIndex]
  const fontSize = Math.floor(size * 0.45)

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="avatar">
  <defs>
    <linearGradient id="grad-${gradientIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradient.start}" />
      <stop offset="100%" stop-color="${gradient.end}" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="url(#grad-${gradientIndex})" />
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="Inter, Pretendard, system-ui, sans-serif" font-size="${fontSize}" font-weight="700">${firstLetter}</text>
</svg>`

  const encoded = base64Encode(svg)
  return `data:image/svg+xml;base64,${encoded}`
}

export function generateAvatarSet(nickname: string, size = 80) {
  return gradients.map((_, index) => generateAvatarSVG(nickname, size, index))
}
