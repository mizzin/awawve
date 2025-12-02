import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const placeId = searchParams.get("placeId")
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey || !placeId) {
    return NextResponse.json({ ok: false })
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,formattedAddress,location`

  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": apiKey },
  })
  const json = await res.json()

  return NextResponse.json({
    ok: true,
    place: {
      placeId: json.id,
      name: json.displayName?.text,
      address: json.formattedAddress,
      lat: json.location?.latitude,
      lng: json.location?.longitude,
    },
  })
}
