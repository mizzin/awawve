"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "tab1", label: "story" },
  { key: "tab2", label: "서비스 소식/정책" },
  { key: "tab3", label: "버전 업데이트" },
]

export default function InfoPage() {
  const [activeTab, setActiveTab] = useState<string>("tab1")

  const content = useMemo(() => {
    switch (activeTab) {
      case "tab1":
        return (
          <div className="space-y-6 rounded-xl border border-[var(--awave-border)] bg-white p-5 shadow-sm text-[var(--awave-text)] leading-relaxed">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">aWave Story</h2>
              <p className="text-sm text-[var(--awave-text-light)]">
                필리핀 생활에서 꼭 필요하지만 쉽게 말하기 어려운 정보들을 가볍게 나누고 받을 수 있는 공간. 그 작은 필요에서 aWave가 시작됐습니다.
              </p>
            </div>

            <div className="space-y-5 text-sm text-[var(--awave-text-light)]">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--awave-text)]">aWave는 ‘가볍고 안전한 연결’을 지향합니다.</h3>
                <p>
                  필리핀 생활에서 꼭 필요하지만 쉽게 말하기 어려운 정보들을 가볍게 나누고 받을 수 있는 공간. 그 작은 필요에서 aWave가 시작됐습니다.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--awave-text)]">개인정보는 최소한으로, 분위기는 최대한 안전하게.</h3>
                <p>
                  aWave는 이메일 주소 하나만 받습니다. 이름도, 전화번호도 요구하지 않습니다. 대신 스팸·욕설·비방·사기성 활동은 내부에서 즉시 차단해 안전한 흐름을 유지합니다.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--awave-text)]">광고보다 중요한 건 ‘사용자 경험’입니다.</h3>
                <p>
                  페이지를 어지럽히는 광고는 받지 않습니다. 사용자가 찾는 정보에 방해되지 않는 환경을 가장 우선으로 둡니다.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--awave-text)]">작게 시작하지만, 오래가는 방향을 선택합니다.</h3>
                <p>
                  사진은 1장만 업로드 가능한 등 초기에는 꼭 필요한 기능만 담았습니다. 가볍게 시작해도, 오래 신뢰할 수 있는 서비스를 만들고 싶습니다.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--awave-text)]">aWave는 한 지역을 넘어 확장될 준비를 하고 있습니다.</h3>
                <p>
                  필리핀에서 출발했지만 해외 곳곳에서 살아가는 사람들이 서로에게 도움을 건넬 수 있는 안전한 정보 흐름을 만드는 것이 우리의 다음 목표입니다.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--awave-text)]">천천히, 하지만 꾸준하게 운영하겠습니다.</h3>
                <p>
                  작은 팀이지만 운영 · 정책 · 유지보수는 책임지고 이어가겠습니다. aWave가 누군가의 하루를 조금 더 편하게 만든다면 그것만으로도 충분합니다.
                </p>
              </section>
            </div>
          </div>
        )
      case "tab2":
        return (
          <>
            <p className="text-sm text-[var(--awave-text-light)]">서비스 소식과 정책을 모아둔 영역입니다.</p>
            <div className="space-y-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">서비스 소식</h2>
              <ul className="space-y-2 text-sm text-[var(--awave-text-light)]">
                <li>· 피드 / 댓글 / 위치 공유 기능 제공</li>
                <li>· 위치 검색은 1km 반경 내 결과를 우선 제공합니다.</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">수정 규칙</h2>
              <ul className="space-y-2 text-sm text-[var(--awave-text-light)]">
                <li>· 텍스트: 언제든 수정 가능, updated_at 갱신</li>
                <li>· 카테고리: 게시 후 30분 내 자유 수정, 이후 수정 시 이력 기록</li>
                <li>· 위치: 최초 1회만 수정 가능 (이후 버튼 비활성화)</li>
                <li>· 사진: 수정/삭제 불가</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">피드 삭제 시 처리</h2>
              <ul className="space-y-2 text-sm text-[var(--awave-text-light)]">
                <li>· 댓글/반응/스토리지 이미지/주소를 함께 삭제</li>
              </ul>
            </div>
          </>
        )
      case "tab3":
      default:
        return (
          <>
            <p className="text-sm text-[var(--awave-text-light)]">버전 업데이트 메모를 남기는 영역입니다.</p>
            <div className="space-y-3 rounded-xl border border-[var(--awave-border)] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">최근 업데이트</h2>
              <ul className="space-y-2 text-sm text-[var(--awave-text-light)]">
                <li>· 카테고리 배지를 라이트 블루 톤으로 변경</li>
                <li>· 위치 검색에 1km 반경 검색Text 적용</li>
                <li>· 피드 수정 정책(사진 수정 불가, 위치 1회 제한 등) 적용</li>
              </ul>
            </div>
          </>
        )
    }
  }, [activeTab])

  return (
    <UserLayout>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-10 text-[var(--awave-text)]">
        <header className="mb-4 space-y-1">
          <p className="text-sm font-semibold text-[var(--awave-text-light)]">INFO</p>
          <h1 className="text-2xl font-semibold">awave 안내</h1>
        </header>

        <div className="mb-4 flex items-center gap-2 rounded-full bg-[var(--awave-secondary)] p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-full px-4 py-2 text-sm font-medium transition",
                activeTab === tab.key
                  ? "bg-white text-[var(--awave-text)] shadow-sm"
                  : "text-[var(--awave-text-light)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">{content}</div>

        <div className="mt-8 flex justify-end">
          <Link href="/feed">
            <Button variant="outline">피드로 돌아가기</Button>
          </Link>
        </div>
      </div>
    </UserLayout>
  )
}
