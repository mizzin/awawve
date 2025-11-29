"use client"

import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"

import UserLayout from "@/app/layout/UserLayout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabaseClient"

type AvailabilityType = 'email' | 'nickname';
type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'error';
type ErrorField = 'email' | 'nickname';

type AvailabilityResponse = {
  available: boolean;
  message?: string;
};

async function requestAvailability(type: AvailabilityType, value: string) {
  const response = await fetch('/api/check-availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, value }),
  });

  const payload: AvailabilityResponse = await response.json().catch(() => ({
    available: false,
    message: '중복 확인 응답을 읽을 수 없습니다.',
  }));

  if (!response.ok) {
    throw new Error(payload.message ?? '중복 확인 중 오류가 발생했습니다.');
  }

  return payload;
}

const steps = [1, 2, 3];

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<ErrorField, string>>>({});
  const [emailCheckStatus, setEmailCheckStatus] = useState<AvailabilityStatus>('idle');
  const [nicknameCheckStatus, setNicknameCheckStatus] = useState<AvailabilityStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [availabilityMessages, setAvailabilityMessages] = useState<
    Partial<Record<AvailabilityType, string>>
  >({});

  const setFieldError = (field: ErrorField, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: ErrorField) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setAvailabilityMessage = (field: AvailabilityType, message?: string) => {
    setAvailabilityMessages((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const preferenceOptions = ['여행', '식당', '마트', '카페', '화장품', '자동차', '호텔'];
  const regionOptions = ['BGC', 'Ortigas', 'Makati', 'Quezon City', 'Pasay'];

  useEffect(() => {
    setEmailCheckStatus('idle');
    clearFieldError('email');
    setAvailabilityMessage('email');
  }, [email]);

  useEffect(() => {
    setNicknameCheckStatus('idle');
    clearFieldError('nickname');
    setAvailabilityMessage('nickname');
  }, [nickname]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateNickname = (nickname: string) =>
    /^[가-힣a-zA-Z0-9_]{2,12}$/.test(nickname); // 2~12자, 한글/영문/숫자/언더바 허용

  const handleEmailAvailabilityCheck = async () => {
    if (!validateEmail(email)) {
      setEmailCheckStatus('error');
      setFieldError('email', '유효한 이메일 주소를 입력해주세요.');
      return;
    }
    setEmailCheckStatus('checking');
    try {
      const result = await requestAvailability('email', email);
      if (result.available) {
        setEmailCheckStatus('available');
        clearFieldError('email');
        setAvailabilityMessage('email', result.message ?? '사용 가능한 이메일입니다.');
      } else {
        setEmailCheckStatus('duplicate');
        setFieldError('email', result.message ?? '이미 사용 중인 이메일입니다.');
        setAvailabilityMessage('email');
      }
    } catch (error) {
      setEmailCheckStatus('error');
      setFieldError(
        'email',
        error instanceof Error ? error.message : '이메일 중복 확인 중 오류가 발생했습니다.'
      );
    }
  };

  const handleNicknameAvailabilityCheck = async () => {
    if (!validateNickname(nickname)) {
      setNicknameCheckStatus('error');
      setFieldError(
        'nickname',
        '닉네임은 2~12자, 한글/영문/숫자/언더바(_)만 사용할 수 있습니다.'
      );
      return;
    }
    setNicknameCheckStatus('checking');
    try {
      const result = await requestAvailability('nickname', nickname);
      if (result.available) {
        setNicknameCheckStatus('available');
        clearFieldError('nickname');
        setAvailabilityMessage('nickname', result.message ?? '사용 가능한 닉네임입니다.');
      } else {
        setNicknameCheckStatus('duplicate');
        setFieldError('nickname', result.message ?? '이미 사용 중인 닉네임입니다.');
        setAvailabilityMessage('nickname');
      }
    } catch (error) {
      setNicknameCheckStatus('error');
      setFieldError(
        'nickname',
        error instanceof Error ? error.message : '닉네임 중복 확인 중 오류가 발생했습니다.'
      );
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateEmail(email)) {
        setFieldError('email', '유효한 이메일 주소를 입력해주세요.');
        return;
      }
      if (emailCheckStatus !== 'available') {
        setFieldError('email', '이메일 중복 확인을 진행해주세요.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!validateNickname(nickname)) {
        setFieldError(
          'nickname',
          '닉네임은 2~12자, 한글/영문/숫자/언더바(_)만 사용할 수 있습니다.'
        );
        return;
      }
      if (nicknameCheckStatus !== 'available') {
        setFieldError('nickname', '닉네임 중복 확인을 진행해주세요.');
        return;
      }
    }
    setErrors({});
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleTogglePreference = (preference: string) => {
    setPreferences((prev) =>
      prev.includes(preference) ? prev.filter((p) => p !== preference) : [...prev, preference]
    );
  };

  const handleToggleRegion = (region: string) => {
    setRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const handleSubmit = async () => {
    if (regions.length < 1) {
      toast({
        title: "관심 지역을 최소 1개 이상 선택해주세요.",
        duration: 2000,
        className: "rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] text-[var(--awave-text)]",
      })
      return;
    }
    setSubmitting(true)
    try {
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "")
      const emailRedirectTo = origin ? `${origin.replace(/\/$/, "")}/auth/callback` : undefined
      const signupDraft = {
        email,
        nickname,
        interest: preferences,
        region: regions,
      }

      // Persist draft to complete profile creation after magic link validation.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("awave.signup.draft", JSON.stringify(signupDraft))
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
          data: { signupDraft },
        },
      })

      if (authError) {
        const friendly =
          (authError as any)?.status === 429 || (authError as any)?.code === "over_email_send_rate_limit"
            ? "이메일 인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
            : authError.message
        throw new Error(friendly)
      }

      const nickLabel = nickname ? `@${nickname}` : "새로운 파도"
      toast({
        title: "회원가입 신청 완료",
        description: `${nickLabel} 님의 이메일로 로그인 링크를 보냈어요. 30분 이내에 메일을 열어 로그인해주세요.`,
        duration: 3500,
        className:
          "rounded-xl border border-[var(--awave-border)] bg-[var(--awave-secondary)] text-[var(--awave-text)]",
      })
      setTimeout(() => router.push("/login"), 2000)
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "회원가입 중 오류가 발생했습니다."
      toast({
        title: "회원가입 실패",
        description: message,
        duration: 2500,
        className: "rounded-xl border border-red-200 bg-red-50 text-red-800",
      })
      setErrors((prev) => ({ ...prev, email: undefined, nickname: undefined }))
    } finally {
      setSubmitting(false)
    }
  };

  return (
    <UserLayout isLoggedIn={false}>
      <div className="relative mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md flex-col items-center justify-start overflow-hidden bg-[var(--awave-bg)] px-4 pb-24 pt-10 sm:pt-16">
        <Card className="w-full space-y-6 p-6">
          {/* Step Indicator */}
          <div className="flex justify-center space-x-4">
            {steps.map((step) => (
              <div
                key={step}
                className={`h-3 w-3 rounded-full ${
                  step === currentStep ? "bg-[var(--awave-button)]" : "bg-[var(--awave-secondary)]"
                }`}
              />
            ))}
          </div>

          {/* Step Content with Fade Animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">이메일 입력</h2>
                  <Label htmlFor="email">이메일 주소</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                  <div className="mt-3 rounded-lg border border-[var(--awave-border)] bg-[var(--awave-secondary)] px-4 py-3 text-sm text-[var(--awave-text)] leading-relaxed">
                    <p className="font-medium">입력하신 이메일로 로그인 링크를 보내드려요.</p>
                    <p className="mt-1 text-xs">
                      받은 편지함을 확인할 수 있는 이메일을 입력해주세요. 회원가입 승인과 로그인에 사용됩니다.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={handleEmailAvailabilityCheck}
                    disabled={!email || emailCheckStatus === 'checking'}
                  >
                    {emailCheckStatus === 'checking' ? '확인 중...' : '이메일 중복 확인'}
                  </Button>
                  {emailCheckStatus === 'available' && availabilityMessages.email && (
                    <p className="text-sm text-green-600 mt-2">{availabilityMessages.email}</p>
                  )}
                  {errors.email && <p className="text-sm text-red-600 mt-2">{errors.email}</p>}
                  <Button
                    className="w-full mt-6"
                    onClick={handleNext}
                    disabled={!email || emailCheckStatus !== 'available'}
                  >
                    다음
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">닉네임 입력</h2>
                  <Label htmlFor="nickname">닉네임</Label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="닉네임을 입력하세요"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1"
                  />
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 leading-relaxed">
                    <p className="font-medium">닉네임 규칙 안내</p>
                    <p className="mt-1 text-xs">- 한글, 영문 대소문자, 숫자, 언더바(_)만 사용해 2~12자로 만들어주세요.</p>
                    <p className="mt-1 text-xs">- 모든 닉네임은 고유해야 하므로 중복 확인을 완료해야 합니다.</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={handleNicknameAvailabilityCheck}
                    disabled={!nickname || nicknameCheckStatus === 'checking'}
                  >
                    {nicknameCheckStatus === 'checking' ? '확인 중...' : '닉네임 중복 확인'}
                  </Button>
                  {nicknameCheckStatus === 'available' && availabilityMessages.nickname && (
                    <p className="text-sm text-green-600 mt-2">{availabilityMessages.nickname}</p>
                  )}
                  {errors.nickname && <p className="text-sm text-red-600 mt-2">{errors.nickname}</p>}
                  <p className="text-sm text-gray-500 mt-4">
                    닉네임은 다른 사용자에게 표시되는 이름입니다. <br />
                    나중에 프로필에서 변경할 수 있습니다.
                  </p>
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={handlePrevious}>
                      이전
                    </Button>
                    <Button onClick={handleNext} disabled={!nickname || nicknameCheckStatus !== 'available'}>
                      다음
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">취향 및 지역 선택</h2>
                  <div>
                    <p className="font-medium">취향 선택 (최대 5개)</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {preferenceOptions.map((option) => (
                        <Button
                          key={option}
                          variant={preferences.includes(option) ? 'default' : 'outline'}
                          onClick={() => handleTogglePreference(option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="font-medium">관심 지역 선택 (최소 1개)</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {regionOptions.map((region) => (
                        <Button
                          key={region}
                          variant={regions.includes(region) ? 'default' : 'outline'}
                          onClick={() => handleToggleRegion(region)}
                        >
                          {region}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={handlePrevious}>
                      이전
                    </Button>
                    <Button onClick={handleSubmit} disabled={regions.length < 1 || submitting}>
                      {submitting ? "처리 중..." : "회원가입 완료"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </UserLayout>
  )
}
