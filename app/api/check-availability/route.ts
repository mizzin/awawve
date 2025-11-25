import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const profileTable = process.env.SUPABASE_PROFILE_TABLE ?? 'profiles';
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

function normalize(value: string) {
  return value.trim();
}

function availabilityMessage(type: AvailabilityType, available: boolean) {
  const label = type === 'email' ? '이메일' : '닉네임';
  return available ? `${label}을 사용할 수 있습니다.` : `이미 사용 중인 ${label}입니다.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as CheckAvailabilityBody | null;
    const type = body?.type;
    const value = body?.value;

    if (type !== 'email' && type !== 'nickname') {
      return NextResponse.json({ message: '유효하지 않은 확인 타입입니다.' }, { status: 400 });
    }
    if (typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ message: '확인할 값을 입력해주세요.' }, { status: 400 });
    }

    const normalizedValue = normalize(value);
    const column = columnMap[type];

    const { count, error } = await supabase
      .from(profileTable)
      .select('id', { count: 'exact', head: true })
      .ilike(column, normalizedValue);

    if (error) {
      console.error('Supabase availability check error:', error);
      return NextResponse.json(
        { message: '중복 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const available = (count ?? 0) === 0;

    return NextResponse.json({
      available,
      message: availabilityMessage(type, available),
    });
  } catch (error) {
    console.error('Availability route error:', error);
    return NextResponse.json(
      { message: '중복 확인 요청을 처리할 수 없습니다.' },
      { status: 500 }
    );
  }
}
