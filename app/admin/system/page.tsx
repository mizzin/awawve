"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

type Metric = {
  label: string
  value: number // 0-100
  description: string
}

function ProgressBar({ value }: { value: number }) {
  const colorClass = value >= 80 ? "bg-amber-500" : "bg-[var(--awave-button)]"
  return (
    <div className="h-2 w-full rounded-full bg-[var(--awave-border)]">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
    </div>
  )
}

export default function AdminSystemPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true)
      try {
        const res = await fetch("/api/system-metrics")
        if (!res.ok) {
          throw new Error("시스템 지표를 불러오지 못했습니다.")
        }
        const data = (await res.json()) as { metrics: Metric[] }
        setMetrics(data.metrics)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "시스템 지표를 불러오지 못했습니다."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void fetchMetrics()
  }, [])

  const warnings = useMemo(() => metrics.filter((m) => m.value >= 80), [metrics])

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
        <p className="text-lg font-semibold text-[var(--awave-text)]">시스템 모니터링</p>
        <p className="text-sm text-[var(--awave-text-light)]">자원 사용량과 경고 상태를 확인하세요.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {loading && (
          <div className="rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm text-sm text-[var(--awave-text-light)]">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              지표를 불러오는 중입니다.
            </div>
          </div>
        )}
        {!loading && metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--awave-text)]">{metric.label}</p>
                <p className="text-xs text-[var(--awave-text-light)]">{metric.description}</p>
              </div>
              <span className="text-lg font-semibold text-[var(--awave-text)]">{metric.value}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={metric.value} />
            </div>
            {metric.value >= 80 && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                <AlertTriangle className="size-4" />
                임계치 도달
              </div>
            )}
          </div>
        ))}
      </section>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-[var(--awave-text)]">경고 항목</p>
          <div className="mt-2 space-y-2 text-sm text-[var(--awave-text-light)]">
            {warnings.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <span>{item.label} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
