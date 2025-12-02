import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const latNum = lat ? Number(lat) : null
  const lngNum = lng ? Number(lng) : null
  const hasLocation = Number.isFinite(latNum) && Number.isFinite(lngNum)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey || !query) {
    return NextResponse.json({ ok: false, predictions: [] })
  }

  try {
    const body: Record<string, unknown> = {
      input: query,
      languageCode: "ko",
      regionCode: "PH"
    }

    if (hasLocation) {
      body.locationBias = {
        circle: {
          center: {
            latitude: latNum,
            longitude: lngNum,
          },
          radius: 1000,
        },
      }
    }

    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // v1 autocomplete returns `suggestions` -> `placePrediction` objects
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text"
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()

    if (!res.ok) {
      // Bubble up status/body for easier debugging in the browser console
      return NextResponse.json({
        ok: false,
        predictions: [],
        error: "google api error",
        status: res.status,
        detail: text,
      })
    }

    const data = text ? JSON.parse(text) : {}

    // Keep response shape as { predictions } for the UI, but map from v1 `suggestions`
    const predictions = data.suggestions ?? data.predictions ?? []

    return NextResponse.json({ ok: true, predictions })
  } catch (err) {
    console.error("[autocomplete] error:", err)
    return NextResponse.json({ ok: false, predictions: [], error: "internal error" })
  }
}
