import { Activity, FileText, Shield, Users } from "lucide-react"

export default function AdminHomePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="rounded-xl border border-[var(--awave-border)] bg-white p-6 shadow-sm">
        <p className="text-2xl font-semibold text-[var(--awave-text)]">관리자 메인 페이지</p>
        <p className="mt-2 text-sm text-[var(--awave-text-light)]">
          좌측 메뉴에서 원하는 관리 기능을 선택하세요.
        </p>
      </div>
    </div>
  )
}
