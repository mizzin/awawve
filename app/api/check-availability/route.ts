import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// 기본 테이블/컬럼을 users 스키마에 맞춰 설정
const profileTable = process.env.SUPABASE_PROFILE_TABLE ?? 'users';
const emailColumn = process.env.SUPABASE_EMAIL_COLUMN ?? 'email';
const nicknameColumn = process.env.SUPABASE_NICKNAME_COLUMN ?? 'nickname';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type AvailabilityType = 'email' | 'nickname';

const columnMap: Record<AvailabilityType, string> = {
  email: emailColumn,
  nickname: nicknameColumn,
};

interface CheckAvailabilityBody {
  type: AvailabilityType;
  value: string;
}

function isAvailabilityType(value: unknown): value is AvailabilityType {
  return value === 'email' || value === 'nickname';
}

function normalize(value: string) {
  return value.trim();
}

function availabilityMessage(type: AvailabilityType, available: boolean) {
  const label = type === 'email' ? '이메일' : '닉네임';
  return available ? `${label}을 사용할 수 있습니다.` : `이미 사용 중인 ${label}입니다.`;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const inferredType: AvailabilityType | null =
      isAvailabilityType(body.type)
        ? body.type
        : typeof body.email === 'string'
          ? 'email'
          : typeof body.nickname === 'string'
            ? 'nickname'
            : null;

    const inferredValue =
      typeof body.value === 'string'
        ? body.value
        : inferredType === 'email'
          ? (body.email as string | undefined)
          : inferredType === 'nickname'
            ? (body.nickname as string | undefined)
            : null;

    if (!inferredType) {
      return NextResponse.json({ message: '유효하지 않은 확인 타입입니다.' }, { status: 400 });
    }

    if (typeof inferredValue !== 'string') {
      return NextResponse.json({ message: '확인할 값을 입력해주세요.' }, { status: 400 });
    }

    const normalizedValue = normalize(inferredValue);
    if (!normalizedValue) {
      return NextResponse.json({ message: '확인할 값을 입력해주세요.' }, { status: 400 });
    }

    const column = columnMap[inferredType];
    if (!column) {
      return NextResponse.json({ message: '유효하지 않은 확인 타입입니다.' }, { status: 400 });
    }

    const { count, error } = await supabase
      .from(profileTable)
      .select('id', { count: 'exact', head: true })
      .ilike(column, normalizedValue);

    if (error) {
      console.error('Supabase availability check error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: (error as any)?.code,
      });
      return NextResponse.json(
        {
          message:
            error.message ||
            error.hint ||
            '중복 확인 중 오류가 발생했습니다. 환경 변수 또는 Supabase 권한을 확인하세요.',
        },
        { status: 500 }
      );
    }

    const available = (count ?? 0) === 0;

    return NextResponse.json({
      available,
      message: availabilityMessage(inferredType, available),
    });
  } catch (error) {
    console.error('Availability route error:', error);
    return NextResponse.json(
      { message: '중복 확인 요청을 처리할 수 없습니다.' },
      { status: 500 }
    );
  }
}
