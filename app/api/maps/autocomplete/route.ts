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
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: query,
      languageCode: "ko",
      includedPrimaryTypes: ["restaurant", "cafe", "bar", "store", "point_of_interest"]
    }),
  })

  const data = await res.json()

  return NextResponse.json({
    ok: true,
    predictions: data?.suggestions ?? [] 
  })
}
