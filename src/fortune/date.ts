import { calculateFourPillars, solarToLunar } from 'manseryeok';

export interface YMD {
  year: number;
  month: number;
  day: number;
}

export interface DayInfo {
  date: YMD;
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean };
  /** 0=일 … 6=토 */
  weekday: number;
  dayStem: string;
  dayBranch: string;
  /** 절기 월(월건)의 지지 */
  monthBranch: string;
}

export const WEEKDAYS = '일월화수목금토';

export const fmt = ({ year, month, day }: YMD) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function parseYMD(s: string): YMD {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) throw new Error(`날짜는 YYYY-MM-DD 형식이어야 합니다: ${s}`);
  return { year: +m[1], month: +m[2], day: +m[3] };
}

export function addDays({ year, month, day }: YMD, n: number): YMD {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function todayKST(): YMD {
  return parseYMD(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()));
}

export const weekdayOf = ({ year, month, day }: YMD) => new Date(Date.UTC(year, month - 1, day)).getUTCDay();

export const julianDay = ({ year, month, day }: YMD) => Math.floor(Date.UTC(year, month - 1, day) / 86400000) + 2440588;

const cache = new Map<string, DayInfo>();

/** 정오 기준으로 그날의 음력, 일진, 절기 월을 구한다 */
export function dayInfo(date: YMD): DayInfo {
  const key = fmt(date);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = calculateFourPillars({ ...date, hour: 12, minute: 0 });
  const info: DayInfo = {
    date,
    lunar: solarToLunar(date.year, date.month, date.day),
    weekday: weekdayOf(date),
    dayStem: p.day.heavenlyStem,
    dayBranch: p.day.earthlyBranch,
    monthBranch: p.month.earthlyBranch,
  };
  cache.set(key, info);
  return info;
}
