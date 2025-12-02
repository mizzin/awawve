import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey || !query) {
    return NextResponse.json({ ok: false, error: "missing query/apiKey" })
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "placePrediction.structuredFormat,placePrediction.placeId",
    },
    body: JSON.stringify({
      input: query,
      includedPrimaryTypes: ["restaurant", "cafe", "store", "point_of_interest"],
      languageCode: "ko",
    }),
  })

  const data = await res.json()
  return NextResponse.json({ ok: true, predictions: data?.predictions ?? [] })
}
