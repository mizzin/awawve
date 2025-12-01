import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const placeId = searchParams.get("placeId")

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return NextResponse.json({ error: "Missing Google Maps API key" }, { status: 500 })
  }

  try {
    /**
     * ------------------------------------------------------
     * ① placeId 가 있으면 → Place Details API 사용
     * ------------------------------------------------------
     */
    if (placeId) {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${key}`
      const res = await fetch(url)
      const json = await res.json()

      return NextResponse.json({
        ok: true,
        place: json.result ?? null,
        address: json.result?.formatted_address ?? null,
      })
    }

    /**
     * ------------------------------------------------------
     * ② placeId 가 없고 lat/lng 로 요청 → Nearby + Geocode
     * ------------------------------------------------------
     */
    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 })
    }

    // Nearby Search API
    const placesURL = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=30&key=${key}`
    const placesRes = await fetch(placesURL)
    const placesJson = await placesRes.json()
    const bestPlace = placesJson.results?.[0] ?? null

    // Reverse Geocoding API
    const geoURL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    const geoRes = await fetch(geoURL)
    const geoJson = await geoRes.json()
    const address = geoJson.results?.[0]?.formatted_address ?? "주소 없음"

    return NextResponse.json({
      ok: true,
      place: bestPlace,
      address,
      lat,
      lng,
    })
  } catch (error) {
    console.error("[maps api] fetch error", error)
    return NextResponse.json({ error: "Failed to fetch place info" }, { status: 500 })
  }
}
