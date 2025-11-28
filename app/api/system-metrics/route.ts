import { NextResponse } from "next/server"

type FeedRow = {
  id: number
  content: string
  createdAt: string
}

type CommentRow = {
  id: number
  content: string
  createdAt: string
}

type ReportRow = {
  id: number
  createdAt: string
}

const MOCK_BASE_URL = process.env.NEXT_PUBLIC_MOCK_API || "http://localhost:4000"

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${MOCK_BASE_URL}${path}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`)
  }
  return res.json() as Promise<T>
}

function withinDays(dateString: string, days: number) {
  const created = new Date(dateString).getTime()
  const now = Date.now()
  return now - created <= days * 24 * 60 * 60 * 1000
}

export async function GET() {
  try {
    const [feeds, comments, reports] = await Promise.all([
      getJson<FeedRow[]>("/feeds"),
      getJson<CommentRow[]>("/comments"),
      getJson<ReportRow[]>("/reports"),
    ])

    // Rough estimates for storage/traffic based on mock data sizes
    const feedBytes = feeds.reduce((acc, f) => acc + Buffer.byteLength(f.content || "", "utf8"), 0)
    const commentBytes = comments.reduce((acc, c) => acc + Buffer.byteLength(c.content || "", "utf8"), 0)
    const reportBytes = reports.length * 300 // assume small payload per report
    const totalBytes = feedBytes + commentBytes + reportBytes
    const storageCap = 5 * 1024 * 1024 // 5MB cap for mock calculation
    const storagePercent = Math.min(100, Math.round((totalBytes / storageCap) * 100))

    const feedsToday = feeds.filter((f) => withinDays(f.createdAt, 1)).length
    const commentsToday = comments.filter((c) => withinDays(c.createdAt, 1)).length
    const dailyTrafficBytes = feedsToday * 4000 + commentsToday * 1500
    const dailyCap = 50_000 // 50KB cap mock
    const dailyTrafficPercent = Math.min(100, Math.round((dailyTrafficBytes / dailyCap) * 100))

    const feedsWeek = feeds.filter((f) => withinDays(f.createdAt, 7)).length
    const commentsWeek = comments.filter((c) => withinDays(c.createdAt, 7)).length
    const weeklyTrafficBytes = feedsWeek * 4000 + commentsWeek * 1500
    const weeklyCap = 300_000 // mock cap
    const weeklyTrafficPercent = Math.min(100, Math.round((weeklyTrafficBytes / weeklyCap) * 100))

    const imageUploads = Math.min(100, Math.round((feeds.length / 50) * 100)) // assume 1 image per feed target 50

    const metrics = [
      { label: "저장공간 사용량", value: storagePercent, description: "스토리지 사용 비율" },
      { label: "일간 트래픽", value: dailyTrafficPercent, description: "오늘 전송량 기준" },
      { label: "주간 트래픽", value: weeklyTrafficPercent, description: "최근 7일 총합" },
      { label: "이미지 업로드", value: imageUploads, description: "피드 기반 업로드 비율" },
    ]

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error("system-metrics error", error)
    return NextResponse.json({ metrics: [], message: "시스템 지표를 불러오지 못했습니다." }, { status: 500 })
  }
}
