import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    if (!lat || !lng) {
      return NextResponse.json({ ok: false, error: "Missing lat/lng" })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing Google Maps API key" })
    }

    // -------------------------------------------------------
    // 1) Places API (v1) - Nearby Search
    // -------------------------------------------------------
    const nearbyRes = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: {
                latitude: Number(lat),
                longitude: Number(lng),
              },
              radius: 50,
            },
          },
        }),
      }
    )

    const nearbyJson = await nearbyRes.json()
    const best = nearbyJson?.places?.[0] ?? null

    // -------------------------------------------------------
    // 2) 기본 주소 (fallback)
    // -------------------------------------------------------
    let fallbackAddress = "주소 없음"

    if (!best) {
      // Reverse Geocode (fallback)
      const revRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      )
      const revJson = await revRes.json()
      fallbackAddress =
        revJson?.results?.[0]?.formatted_address || "주소 없음"
    }

    return NextResponse.json({
      ok: true,
      place: best
        ? {
            placeId: best.id,
            name: best.displayName?.text ?? null,
            address: best.formattedAddress ?? fallbackAddress,
            lat: best.location?.latitude,
            lng: best.location?.longitude,
          }
        : null,
      address: best?.formattedAddress ?? fallbackAddress,
      lat,
      lng,
    })
  } catch (e) {
    console.error("[maps api error]", e)
    return NextResponse.json({ ok: false, error: "internal error" })
  }
}
