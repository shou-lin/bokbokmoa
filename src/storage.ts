// 로그인이 없으므로 프로필과 일정은 이 기기 브라우저(localStorage)에만 저장하고 서버로 보내지 않는다.
import { useEffect, useState } from 'react';
import type { Profile } from './fortune/personal';

export type Kind = '이사' | '계약' | '개업/투자' | '기타';

export interface Schedule {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  kind: Kind;
  createdAt: string;
}

const KEYS = { profile: 'bokbokmoa.profile', schedules: 'bokbokmoa.schedules', onboarded: 'bokbokmoa.onboarded' } as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 개인 정보 보호 모드 등에서 저장이 막혀도 화면은 그대로 동작한다
  }
}

function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => write(key, value), [key, value]);
  return [value, setValue] as const;
}

export const useProfile = () => useStored<Profile | null>(KEYS.profile, null);
export const useSchedules = () => useStored<Schedule[]>(KEYS.schedules, []);
export const useOnboarded = () => useStored<boolean>(KEYS.onboarded, false);
