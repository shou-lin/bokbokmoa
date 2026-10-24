// 점수 계산 (PRD "점수 계산"): 출처별 100점 만점 점수와 그 평균
import { addDays, type DayInfo, dayInfo, type YMD } from './date';
import { personalRules, type Saju } from './personal';
import { commonRules, FIELDS, type Field, type Rule, type Signals, type SourceId, thaiCovered } from './rules';

export type Scores = Record<Field, number>;
export type Grade = '좋음' | '보통' | '조심';

export const SOURCES: Record<SourceId, { label: string; flag: string }> = {
  kr: { label: '한국', flag: '🇰🇷' },
  jp: { label: '일본', flag: '🇯🇵' },
  th: { label: '태국', flag: '🇹🇭' },
  maya: { label: '마야', flag: '🇲🇽' },
  me: { label: '나', flag: '🙋' },
};

// 기준 70점, 신호 1당 8점, 40~100점. 나쁜 날도 40점 밑으로는 내려가지 않는다
const BASE = 70;
const STEP = 8;
const FLOOR = 40;
const toScore = (x: number) => Math.max(FLOOR, Math.min(100, Math.round(BASE + x * STEP)));

export function sumSignals(rules: Rule[]): Record<Field, number> {
  const s = { 종합: 0, 이동: 0, 계약: 0, 재물: 0 };
  for (const r of rules) for (const [f, v] of Object.entries(r.signals) as [Field, number][]) s[f] += v;
  return s;
}

/** 종합 = 종합 신호 + 나머지 세 분야 신호의 평균 */
export function score(s: Record<Field, number>): Scores {
  return {
    종합: toScore(s.종합 + (s.이동 + s.계약 + s.재물) / 3),
    이동: toScore(s.이동),
    계약: toScore(s.계약),
    재물: toScore(s.재물),
  };
}

export const average = (list: Scores[]): Scores =>
  Object.fromEntries(FIELDS.map((f) => [f, Math.round(list.reduce((a, s) => a + s[f], 0) / list.length)])) as Scores;

// 출처별 점수와 평균 점수는 폭이 달라 등급 경계를 따로 둔다.
// 평균 경계는 2026-04-16~2027-04-15 일반 모드에서 좋음 약 27%, 조심 약 17%가 나오는 값
export const gradeOf = (x: number): Grade => (x >= 82 ? '좋음' : x <= 56 ? '조심' : '보통');
export const gradeOfAverage = (x: number): Grade => (x >= 74 ? '좋음' : x <= 65 ? '조심' : '보통');

export interface SourceResult {
  id: SourceId;
  rules: Rule[];
  scores: Scores;
}

export interface DayResult {
  info: DayInfo;
  sources: SourceResult[];
  average: Scores;
  alerts: Rule[];
  /** + 신호와 − 신호가 함께 있는 분야 */
  conflicts: Field[];
}

const clampPersonal = (s: Record<Field, number>) =>
  Object.fromEntries(FIELDS.map((f) => [f, Math.max(-2, Math.min(2, s[f]))])) as Record<Field, number>;

export function scoreDay(date: YMD, me?: Saju): DayResult {
  const info = dayInfo(date);
  const all = commonRules(info);
  const alerts = all.filter((r) => r.alert);
  const scored = all.filter((r) => !r.alert);
  const ids: SourceId[] = ['kr', 'jp', ...(thaiCovered(info) ? (['th'] as const) : []), 'maya'];
  const sources: SourceResult[] = ids.map((id) => {
    const rules = scored.filter((r) => r.source === id);
    return { id, rules, scores: score(sumSignals(rules)) };
  });
  const personal = me ? personalRules(info, me) : [];
  if (me) sources.push({ id: 'me', rules: personal, scores: score(clampPersonal(sumSignals(personal))) });
  const signed = [...scored, ...personal];
  const has = (f: Field, pos: boolean) => signed.some((r) => (pos ? (r.signals[f] ?? 0) > 0 : (r.signals[f] ?? 0) < 0));
  return {
    info,
    sources,
    average: average(sources.map((s) => s.scores)),
    alerts,
    conflicts: FIELDS.filter((f) => has(f, true) && has(f, false)),
  };
}

export function scoreRange(start: YMD, days: number, me?: Saju): DayResult[] {
  return Array.from({ length: days }, (_, i) => scoreDay(addDays(start, i), me));
}

export type { Field, Rule, Signals };
