"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Filter, Loader2, ShieldOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockApi, type ReportRow, type ReportType } from "@/lib/mockApi"

type ActionKey = "delete" | "sanction" | "dismiss"

const actionMeta: Record<
  ActionKey,
  { label: string; icon: typeof AlertTriangle; nextStatus: ReportRow["status"]; lockUser: boolean; lockReason?: string | null }
> = {
  delete: {
    label: "삭제",
    icon: AlertTriangle,
    nextStatus: "처리",
    lockUser: true,
    lockReason: "신고 처리 중으로 이용이 제한됩니다.",
  },
  sanction: {
    label: "제재",
    icon: ShieldOff,
    nextStatus: "처리",
    lockUser: true,
    lockReason: "제재가 적용되어 이용이 제한됩니다.",
  },
  dismiss: {
    label: "무혐의",
    icon: CheckCircle2,
    nextStatus: "무혐의",
    lockUser: false,
    lockReason: null,
  },
}

export default function AdminReportPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<ReportType | "전체">("전체")
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      try {
        const data = await mockApi.getReports()
        setReports(data)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "신고 목록을 불러오지 못했어요."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void fetchReports()
  }, [])

  const filtered = useMemo(() => {
    return reports.filter((item) => {
      const matchText = item.reason.includes(search) || item.target.includes(search)
      const matchType = typeFilter === "전체" ? true : item.type === typeFilter
      return matchText && matchType
    })
  }, [reports, search, typeFilter])

  const handleAction = async (report: ReportRow, actionKey: ActionKey) => {
    const action = actionMeta[actionKey]
    if (
      actionKey === "delete" &&
      !window.confirm("해당 콘텐츠를 숨김/삭제 상태로 전환하고 신고를 처리할까요?\n계정은 삭제되지 않으며 잠금 상태만 적용됩니다.")
    ) {
      return
    }
    setMutatingId(report.id)

    try {
      const updatedReport = await mockApi.updateReportStatus(report.id, action.nextStatus)
      if (action.lockUser) {
        await mockApi.setUserLock(report.targetUserId, "locked", action.lockReason ?? "신고 처리 중입니다.")
      } else {
        await mockApi.setUserLock(report.targetUserId, "active", null)
      }

      setReports((prev) => prev.map((item) => (item.id === report.id ? updatedReport : item)))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "신고 처리에 실패했습니다."
      setError(message)
    } finally {
      setMutatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--awave-text)]">신고 센터</p>
          <p className="text-sm text-[var(--awave-text-light)]">신고 접수/처리 현황</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="신고 대상/사유 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" className="gap-2" type="button">
            <Filter className="size-4" />
            필터
          </Button>
          <div className="flex items-center gap-1">
            {(["전체", "글 신고", "댓글 신고", "사용자 신고"] as const).map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                className="px-3 text-xs"
                onClick={() => setTypeFilter(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-[var(--awave-border)] bg-white shadow-sm">
        <div className="grid grid-cols-6 items-center border-b border-[var(--awave-border)] bg-[var(--awave-secondary)] px-3 py-2 text-xs font-semibold text-[var(--awave-text-light)]">
          <span>유형</span>
          <span className="col-span-2">사유</span>
          <span>대상</span>
          <span>신고자</span>
          <span className="text-center">상태</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-[var(--awave-text-light)]">
            <Loader2 className="size-4 animate-spin" />
            신고 데이터를 불러오는 중입니다.
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-[var(--awave-text-light)]">신고가 없습니다.</div>
        )}

        {filtered.map((report) => {
          const disableActions = mutatingId === report.id
          return (
            <div
              key={report.id}
              className="grid grid-cols-6 items-center border-b border-[var(--awave-border)] px-3 py-3 text-sm last:border-b-0"
            >
              <span className="text-[var(--awave-text)]">{report.type}</span>
              <span className="col-span-2 text-[var(--awave-text)]">{report.reason}</span>
              <span className="text-[var(--awave-text)]">{report.target}</span>
              <span className="text-[var(--awave-text-light)]">{report.reporter}</span>
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    report.status === "대기"
                      ? "bg-amber-50 text-amber-700"
                      : report.status === "처리"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {report.status}
                </span>
              </div>
              <div className="col-span-6 mt-2 flex flex-wrap gap-2 text-xs">
                {(Object.keys(actionMeta) as ActionKey[]).map((key) => {
                  const action = actionMeta[key]
                  const Icon = action.icon
                  const variant = key === "dismiss" ? "default" : "outline"
                  return (
                    <Button
                      key={key}
                      variant={variant}
                      size="sm"
                      className="gap-1"
                      onClick={() => handleAction(report, key)}
                      disabled={disableActions}
                    >
                      {disableActions ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  )
}
