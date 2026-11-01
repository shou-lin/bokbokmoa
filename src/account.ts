// 이메일·비밀번호 로그인(Supabase). 로그인하면 생년월일시를 서버에 두어 다른 기기에서도 다시 넣지 않게 하고,
// 로그인한 사람만 제작자에게 피드백을 보낼 수 있다. 읽기 권한은 DB 정책(supabase/bokbok.sql)이 제작자 이메일로 막는다.
import { createClient, type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { Profile } from './fortune/personal';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key, { auth: { storageKey: 'bokbokmoa.auth' } }) : null;

/** 제작자 모드 스위치를 보여줄 이메일. 피드백 읽기 권한도 DB에서 같은 이메일로만 열려 있다 */
export const CREATOR_EMAIL = 'shourim01@korea.ac.kr';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** Supabase 오류를 사람이 읽을 문장으로 */
function explain(message: string): string {
  if (/invalid login credentials/i.test(message)) return '이메일이나 비밀번호가 맞지 않아요';
  if (/email not confirmed/i.test(message)) return '가입 확인 메일의 링크를 먼저 눌러 주세요';
  if (/already registered|already exists/i.test(message)) return '이미 가입된 이메일이에요. 로그인해 주세요';
  if (/password/i.test(message) && /(6|short|weak)/i.test(message)) return '비밀번호는 6자 이상으로 정해 주세요';
  if (/rate limit|too many/i.test(message)) return '잠시 뒤에 다시 시도해 주세요';
  if (/bokbok_|relation|schema cache/i.test(message)) return '서버 준비가 아직 안 됐어요. 제작자에게 알려 주세요';
  return '잠시 문제가 생겼어요. 다시 시도해 주세요';
}

type Result = { ok: true; note?: string } | { ok: false; error: string };

export async function signIn(email: string, password: string): Promise<Result> {
  if (!supabase) return { ok: false, error: '로그인을 쓸 수 없어요' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: explain(error.message) } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<Result> {
  if (!supabase) return { ok: false, error: '로그인을 쓸 수 없어요' };
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
  if (error) return { ok: false, error: explain(error.message) };
  // 메일 확인을 켜 둔 프로젝트에서는 세션 없이 돌아온다
  return { ok: true, note: data.session ? undefined : `${email}로 확인 메일을 보냈어요. 링크를 누른 뒤 로그인해 주세요` };
}

export async function signOut() {
  await supabase?.auth.signOut();
}

type ProfileRow = { birth_date: string; calendar: 'solar' | 'lunar'; is_leap_month: boolean; birth_time: string | null };

export async function loadProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('bokbok_profiles').select('birth_date, calendar, is_leap_month, birth_time').maybeSingle<ProfileRow>();
  return data ? { birthDate: data.birth_date, calendar: data.calendar, isLeapMonth: data.is_leap_month, birthTime: data.birth_time ?? undefined } : null;
}

/** null이면 서버의 내 정보도 지운다 */
export async function saveProfile(userId: string, p: Profile | null) {
  if (!supabase) return;
  if (!p) {
    await supabase.from('bokbok_profiles').delete().eq('user_id', userId);
    return;
  }
  await supabase.from('bokbok_profiles').upsert({ user_id: userId, birth_date: p.birthDate, calendar: p.calendar, is_leap_month: p.isLeapMonth ?? false, birth_time: p.birthTime ?? null, updated_at: new Date().toISOString() });
}

export type Feedback = { id: string; email: string; message: string; created_at: string };

export async function sendFeedback(message: string): Promise<Result> {
  if (!supabase) return { ok: false, error: '로그인을 쓸 수 없어요' };
  const { error } = await supabase.from('bokbok_feedback').insert({ message });
  return error ? { ok: false, error: explain(error.message) } : { ok: true };
}

export async function listFeedback(): Promise<{ items: Feedback[]; error?: string }> {
  if (!supabase) return { items: [] };
  const { data, error } = await supabase.from('bokbok_feedback').select('id, email, message, created_at').order('created_at', { ascending: false }).limit(200);
  return error ? { items: [], error: explain(error.message) } : { items: data ?? [] };
}
