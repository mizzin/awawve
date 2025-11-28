"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Clock, FileText, Filter, Gavel, Loader2, MessageSquare, Shield, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  mockApi,
  type AdminUserRow,
  type CommentRow,
  type FeedRow,
  type NoteRow,
  type ReportRow,
  type SanctionRow,
} from "@/lib/mockApi"

type PanelKey = "detail" | "content" | "reports" | "sanction"

const statusOptions: AdminUserRow["status"][] = ["정상", "제한", "차단"]
const panelLabels: Record<PanelKey, string> = {
  detail: "회원 상세 보기",
  content: "작성한 글/댓글 보기",
  reports: "신고 내역 보기",
  sanction: "제재 설정",
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminUserRow["status"] | "전체">("전체")
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [activePanel, setActivePanel] = useState<PanelKey>("detail")

  const [reports, setReports] = useState<ReportRow[]>([])
  const [feeds, setFeeds] = useState<FeedRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [sanctions, setSanctions] = useState<SanctionRow[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [mutatingFeedId, setMutatingFeedId] = useState<number | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sanctionStatus, setSanctionStatus] = useState<AdminUserRow["status"]>("정상")
  const [sanctionReason, setSanctionReason] = useState("")
  const [sanctionUntil, setSanctionUntil] = useState("")
  const [savingSanction, setSavingSanction] = useState(false)
  const [noteBody, setNoteBody] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      try {
        const list = await mockApi.getUsers()
        setUsers(list)
        setSelectedUserId(list[0]?.id ?? null)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "사용자 목록을 불러오지 못했습니다."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadUsers()
  }, [])

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [selectedUserId, users])

  useEffect(() => {
    if (selectedUserId == null) return
    const userId = selectedUserId

    async function loadPanelData() {
      setPanelLoading(true)
      try {
        if (activePanel === "reports") {
          setReports(await mockApi.getReportsByUser(userId))
        } else if (activePanel === "content") {
          const [userFeeds, userComments] = await Promise.all([
            mockApi.getFeedsByUser(userId),
            mockApi.getCommentsByUser(userId),
          ])
          setFeeds(userFeeds)
          setComments(userComments)
        } else if (activePanel === "sanction") {
          setSanctions(await mockApi.getSanctions(userId))
          if (selectedUser) {
            setSanctionStatus(selectedUser.status)
            setSanctionReason(selectedUser.lockReason ?? "")
          }
        } else if (activePanel === "detail") {
          setNotes(await mockApi.getNotes(userId))
        }
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "데이터를 불러오지 못했습니다."
        setError(message)
      } finally {
        setPanelLoading(false)
      }
    }

    void loadPanelData()
  }, [activePanel, selectedUser, selectedUserId])

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchSearch = user.nickname.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "전체" ? true : user.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, users])

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId)
    setActivePanel("detail")
    setReports([])
    setFeeds([])
    setComments([])
    setSanctions([])
    setNotes([])
  }

  const statusClass = (status: AdminUserRow["status"]) => {
    if (status === "정상") return "bg-emerald-50 text-emerald-700"
    if (status === "제한") return "bg-amber-50 text-amber-700"
    return "bg-red-50 text-red-600"
  }

  const handleSanctionSave = async () => {
    if (!selectedUserId) return
    setSavingSanction(true)
    try {
      const accountState = sanctionStatus === "정상" ? "active" : "locked"
      const reason = sanctionReason.trim() || null
      const updated = await mockApi.updateUserStatus(selectedUserId, sanctionStatus, reason, accountState)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))

      if (sanctionStatus !== "정상") {
        await mockApi.createSanction({
          userId: selectedUserId,
          type: sanctionStatus === "차단" ? "ban" : "restrict",
          reason: reason ?? "운영자 제재",
          issuedAt: new Date().toISOString().slice(0, 10),
          until: sanctionUntil || null,
        })
        setSanctions(await mockApi.getSanctions(selectedUserId))
      }
      setError(null)
      alert("제재 설정이 저장되었습니다.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "제재 설정에 실패했습니다."
      setError(message)
    } finally {
      setSavingSanction(false)
    }
  }

  const handleAddNote = async () => {
    if (!selectedUserId || !noteBody.trim()) return
    setSavingNote(true)
    try {
      const newNote = await mockApi.createNote({
        userId: selectedUserId,
        body: noteBody.trim(),
        author: "admin_bot",
        createdAt: new Date().toISOString(),
      })
      setNotes((prev) => [newNote, ...prev])
      setNoteBody("")
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "메모 저장에 실패했습니다."
      setError(message)
    } finally {
      setSavingNote(false)
    }
  }

  const handleFeedVisibility = async (feedId: number, visibility: FeedRow["visibility"]) => {
    setMutatingFeedId(feedId)
    try {
      const updated = await mockApi.updateFeedVisibility(feedId, visibility)
      setFeeds((prev) => prev.map((f) => (f.id === feedId ? updated : f)))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "피드 상태 변경에 실패했습니다."
      setError(message)
    } finally {
      setMutatingFeedId(null)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--awave-text)]">사용자 관리</p>
          <p className="text-sm text-[var(--awave-text-light)]">닉네임 검색 및 상태별 필터링</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Input
              placeholder="닉네임 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <Button variant="outline" type="button" className="gap-2">
              <Filter className="size-4" />
              필터
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {(["전체", ...statusOptions] as const).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? "default" : "outline"}
                className="px-3 py-1 text-xs"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-[var(--awave-border)] bg-white shadow-sm">
        <div className="grid grid-cols-7 items-center border-b border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-xs font-semibold text-[var(--awave-text-light)]">
          <span>닉네임</span>
          <span>가입일</span>
          <span>마지막 활동</span>
          <span className="text-center">상태</span>
          <span className="text-center">글</span>
          <span className="text-center">댓글</span>
          <span className="text-center">신고</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-4 text-sm text-[var(--awave-text-light)]">
            <Loader2 className="size-4 animate-spin" />
            사용자 데이터를 불러오는 중입니다.
          </div>
        )}
        {!loading &&
          filtered.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              className={`grid grid-cols-7 items-center border-b border-[var(--awave-border)] px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-[var(--awave-secondary)] ${
                selectedUserId === user.id ? "bg-[var(--awave-secondary)]" : ""
              }`}
            >
              <div className="space-y-1">
                <p className="font-semibold text-[var(--awave-text)]">@{user.nickname}</p>
                <div className="flex gap-2 text-xs text-[var(--awave-text-light)]">
                  <span>최근 신고 {user.reports}건</span>
                </div>
              </div>
              <span className="text-[var(--awave-text-light)]">{user.joinedAt}</span>
              <span className="text-[var(--awave-text-light)]">{user.lastActive}</span>
              <span className={`mx-auto rounded-full px-2 py-1 text-xs font-semibold ${statusClass(user.status)}`}>
                {user.status}
              </span>
              <span className="text-center text-[var(--awave-text)]">{user.posts}</span>
              <span className="text-center text-[var(--awave-text)]">{user.comments}</span>
              <span className="text-center text-[var(--awave-text)]">{user.reports}</span>
            </button>
          ))}
      </div>

      <div className="rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(panelLabels) as PanelKey[]).map((key) => (
            <Button
              key={key}
              variant={activePanel === key ? "default" : "outline"}
              className="text-xs"
              onClick={() => setActivePanel(key)}
              disabled={!selectedUser}
            >
              {panelLabels[key]}
            </Button>
          ))}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}

        {selectedUser && activePanel === "detail" && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] p-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-[var(--awave-text-light)]">닉네임</p>
                <p className="text-base font-semibold text-[var(--awave-text)]">@{selectedUser.nickname}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--awave-text-light)]">계정 상태</p>
                <p className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusClass(selectedUser.status)}`}>
                  {selectedUser.status}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--awave-text-light)]">잠금 사유</p>
                <p className="text-sm text-[var(--awave-text)]">{selectedUser.lockReason ?? "없음"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--awave-text-light)]">가입일</p>
                <p className="text-sm text-[var(--awave-text)]">{selectedUser.joinedAt}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--awave-text-light)]">마지막 활동</p>
                <p className="text-sm text-[var(--awave-text)]">{selectedUser.lastActive}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--awave-text-light)]">활동 요약</p>
                <p className="text-sm text-[var(--awave-text)]">
                  글 {selectedUser.posts} · 댓글 {selectedUser.comments} · 신고 {selectedUser.reports}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] p-4">
              <SectionHeader icon={MessageSquare} title="운영자 메모" />
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="메모를 입력하세요. (예: 신고 2건 검토 중, 3/1까지 제한 유지)"
                    className="min-h-[80px] w-full rounded-lg border border-[var(--awave-border)] bg-white p-3 text-sm text-[var(--awave-text)] placeholder:text-[var(--awave-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--awave-button)]/20"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleAddNote} disabled={savingNote || !noteBody.trim()}>
                    {savingNote ? <Loader2 className="size-4 animate-spin" /> : "메모 저장"}
                  </Button>
                  <p className="text-xs text-[var(--awave-text-light)]">저장 시 최신순으로 추가됩니다.</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {panelLoading ? (
                  <LoadingRow />
                ) : notes.length === 0 ? (
                  <EmptyRow message="등록된 메모가 없습니다." />
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-[var(--awave-border)] bg-white px-3 py-2 text-sm text-[var(--awave-text)]"
                    >
                      <div className="flex items-center justify-between text-xs text-[var(--awave-text-light)]">
                        <span>{note.author}</span>
                        <span>{note.createdAt.slice(0, 16).replace("T", " ")}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {selectedUser && activePanel === "content" && (
          <div className="mt-4 space-y-3">
            <SectionHeader icon={FileText} title="작성 글" />
            {panelLoading ? (
              <LoadingRow />
            ) : feeds.length === 0 ? (
              <EmptyRow message="작성한 글이 없습니다." />
            ) : (
              <div className="space-y-2">
                {feeds.map((feed) => (
                  <div
                    key={feed.id}
                    className="rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-sm text-[var(--awave-text)]"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--awave-text-light)]">
                      <span>#{feed.id}</span>
                      <span>{feed.createdAt.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2">{feed.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--awave-text-light)]">
                      <span className="rounded-full bg-white px-2 py-1 font-semibold text-[var(--awave-text)]">
                        상태: {feed.visibility}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleFeedVisibility(feed.id, "hidden")}
                        disabled={mutatingFeedId === feed.id || feed.visibility === "hidden"}
                      >
                        숨기기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleFeedVisibility(feed.id, "deleted")}
                        disabled={mutatingFeedId === feed.id || feed.visibility === "deleted"}
                      >
                        삭제
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleFeedVisibility(feed.id, "visible")}
                        disabled={mutatingFeedId === feed.id || feed.visibility === "visible"}
                      >
                        복구
                      </Button>
                      {mutatingFeedId === feed.id && <Loader2 className="size-4 animate-spin" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <SectionHeader icon={MessageSquare} title="작성 댓글" />
            {panelLoading ? (
              <LoadingRow />
            ) : comments.length === 0 ? (
              <EmptyRow message="작성한 댓글이 없습니다." />
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-sm text-[var(--awave-text)]"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--awave-text-light)]">
                      <span>댓글 #{comment.id} · 피드 #{comment.feedId}</span>
                      <span>{comment.createdAt.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1">{comment.content}</p>
                    <p className="mt-1 text-xs text-[var(--awave-text-light)]">상태: {comment.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedUser && activePanel === "reports" && (
          <div className="mt-4 space-y-3">
            <SectionHeader icon={Shield} title="신고 내역" />
            {panelLoading ? (
              <LoadingRow />
            ) : reports.length === 0 ? (
              <EmptyRow message="신고 내역이 없습니다." />
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-sm text-[var(--awave-text)]"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--awave-text-light)]">
                      <span>
                        #{report.id} · {report.type}
                      </span>
                      <span>{report.createdAt}</span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--awave-text)]">{report.reason}</p>
                    <p className="text-xs text-[var(--awave-text-light)]">대상: {report.target}</p>
                    <p className="text-xs text-[var(--awave-text-light)]">신고자: {report.reporter}</p>
                    <p className="mt-1 inline-block rounded-full bg-white px-2 py-1 text-xs font-semibold text-[var(--awave-text)]">
                      상태: {report.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedUser && activePanel === "sanction" && (
          <div className="mt-4 space-y-3">
            <SectionHeader icon={Gavel} title="제재 설정" />
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-[var(--awave-text-light)]">상태</p>
                <div className="mt-2 flex gap-2">
                  {statusOptions.map((status) => (
                    <Button
                      key={status}
                      variant={sanctionStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSanctionStatus(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--awave-text-light)]">제재 사유</p>
                <Input
                  className="mt-2"
                  placeholder="사유를 입력하세요"
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-[var(--awave-text-light)]">해제 예정일(선택)</p>
                <Input
                  className="mt-2"
                  type="date"
                  value={sanctionUntil}
                  onChange={(e) => setSanctionUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--awave-text-light)]">
                <Clock className="size-4" />
                <span>저장 시 제재 로그가 추가됩니다.</span>
              </div>
              <Button onClick={handleSanctionSave} disabled={savingSanction}>
                {savingSanction ? <Loader2 className="size-4 animate-spin" /> : "저장"}
              </Button>
            </div>

            <SectionHeader icon={AlertCircle} title="제재 로그" />
            {panelLoading ? (
              <LoadingRow />
            ) : sanctions.length === 0 ? (
              <EmptyRow message="제재 로그가 없습니다." />
            ) : (
              <div className="space-y-2">
                {sanctions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-sm text-[var(--awave-text)]"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--awave-text-light)]">
                      <span>#{item.id} · {item.type}</span>
                      <span>{item.issuedAt}</span>
                    </div>
                    <p className="mt-1">{item.reason}</p>
                    <p className="text-xs text-[var(--awave-text-light)]">
                      해제 예정: {item.until ?? "영구"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--awave-text)]">
      <Icon className="size-4 text-[var(--awave-text-light)]" />
      {title}
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-3 text-sm text-[var(--awave-text-light)]">
      <Loader2 className="size-4 animate-spin" />
      불러오는 중입니다.
    </div>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-3 text-sm text-[var(--awave-text-light)]">
      {message}
    </div>
  )
}
