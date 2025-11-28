const MOCK_BASE_URL = process.env.NEXT_PUBLIC_MOCK_API || "http://localhost:4000"

export type ReportStatus = "대기" | "처리" | "무혐의"
export type ReportType = "글 신고" | "댓글 신고" | "사용자 신고"

export type ReportRow = {
  id: number
  type: ReportType
  reason: string
  target: string
  targetUserId: number
  reporter: string
  createdAt: string
  status: ReportStatus
}

export type UserRecord = {
  id: number
  email: string
  nickname: string
  accountState: "active" | "locked"
  lockReason: string | null
}

export type AdminUserRow = UserRecord & {
  joinedAt: string
  lastActive: string
  status: "정상" | "제한" | "차단"
  posts: number
  comments: number
  reports: number
}

export type FeedRow = {
  id: number
  authorId: number
  author: string
  content: string
  createdAt: string
  visibility: "visible" | "hidden" | "deleted"
}

export type CommentRow = {
  id: number
  feedId: number
  userId: number
  content: string
  createdAt: string
  status: "visible" | "hidden" | "deleted"
}

export type SanctionRow = {
  id: number
  userId: number
  type: "restrict" | "ban"
  reason: string
  issuedAt: string
  until: string | null
}

export type NoteRow = {
  id: number
  userId: number
  body: string
  author: string
  createdAt: string
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${MOCK_BASE_URL}${path}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`요청에 실패했어요: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${MOCK_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`생성에 실패했어요: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function patchJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${MOCK_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`업데이트에 실패했어요: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const mockApi = {
  getUsers() {
    return getJson<AdminUserRow[]>("/users")
  },
  getFeeds() {
    return getJson<FeedRow[]>("/feeds")
  },
  getFeed(feedId: number) {
    return getJson<FeedRow>(`/feeds/${feedId}`)
  },
  getReports() {
    return getJson<ReportRow[]>("/reports")
  },
  getReportsByUser(userId: number) {
    return getJson<ReportRow[]>(`/reports?targetUserId=${userId}`)
  },
  getPendingReportsByUser(userId: number) {
    const status = encodeURIComponent("대기")
    return getJson<ReportRow[]>(`/reports?targetUserId=${userId}&status=${status}`)
  },
  updateReportStatus(reportId: number, status: ReportStatus) {
    return patchJson<ReportRow>(`/reports/${reportId}`, { status })
  },
  getUser(userId: number) {
    return getJson<UserRecord>(`/users/${userId}`)
  },
  setUserLock(userId: number, accountState: "active" | "locked", lockReason: string | null = null) {
    return patchJson<UserRecord>(`/users/${userId}`, { accountState, lockReason })
  },
  updateUserStatus(
    userId: number,
    status: AdminUserRow["status"],
    lockReason: string | null,
    accountState: UserRecord["accountState"]
  ) {
    return patchJson<AdminUserRow>(`/users/${userId}`, { status, lockReason, accountState })
  },
  getFeedsByUser(userId: number) {
    return getJson<FeedRow[]>(`/feeds?authorId=${userId}`)
  },
  updateFeedVisibility(feedId: number, visibility: FeedRow["visibility"]) {
    return patchJson<FeedRow>(`/feeds/${feedId}`, { visibility })
  },
  getCommentsByUser(userId: number) {
    return getJson<CommentRow[]>(`/comments?userId=${userId}`)
  },
  getSanctions(userId: number) {
    return getJson<SanctionRow[]>(`/sanctions?userId=${userId}`)
  },
  createSanction(input: Omit<SanctionRow, "id">) {
    return postJson<SanctionRow>("/sanctions", input)
  },
  getNotes(userId: number) {
    return getJson<NoteRow[]>(`/notes?userId=${userId}`)
  },
  createNote(input: Omit<NoteRow, "id">) {
    return postJson<NoteRow>("/notes", input)
  },
}
