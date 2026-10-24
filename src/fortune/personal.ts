// 개인 규칙 (개인 모드에서만): 사주와 그날 일진의 궁합 + 수비학 개인일
import { calculateFourPillars, getTenGod, lunarToSolar, solarToLunar } from 'manseryeok';
import type { DayInfo, YMD } from './date';
import type { Rule, Signals } from './rules';

export interface Profile {
  /** 입력한 날짜 (calendar 기준) YYYY-MM-DD */
  birthDate: string;
  calendar: 'solar' | 'lunar';
  isLeapMonth: boolean;
  /** HH:mm, 모르면 비움 */
  birthTime?: string;
}

export const ZODIAC: Record<string, string> = { 자: '쥐', 축: '소', 인: '호랑이', 묘: '토끼', 진: '용', 사: '뱀', 오: '말', 미: '양', 신: '원숭이', 유: '닭', 술: '개', 해: '돼지' };

export interface Saju {
  yearBranch: string;
  dayStem: string;
  dayBranch: string;
  hourBranch?: string;
  pillars: string[];
  solar: YMD;
  lunar: { month: number; day: number; isLeapMonth: boolean };
}

/** 사주 네 기둥은 저장하지 않고 프로필에서 다시 계산한다. 날은 자정(정자시)에 바뀐다. */
export function sajuOf(profile: Profile): Saju {
  const [year, month, day] = profile.birthDate.split('-').map(Number);
  const [hour, minute] = profile.birthTime ? profile.birthTime.split(':').map(Number) : [12, 0];
  const isLunar = profile.calendar === 'lunar';
  const p = calculateFourPillars({ year, month, day, hour, minute, isLunar, isLeapMonth: profile.isLeapMonth });
  const solar = isLunar ? lunarToSolar(year, month, day, profile.isLeapMonth) : { year, month, day };
  const lunar = isLunar ? { month, day, isLeapMonth: profile.isLeapMonth } : solarToLunar(year, month, day);
  const pillars = [p.year, p.month, p.day].map((x) => x.heavenlyStem + x.earthlyBranch);
  if (profile.birthTime) pillars.push(p.hour.heavenlyStem + p.hour.earthlyBranch);
  return {
    yearBranch: p.year.earthlyBranch,
    dayStem: p.day.heavenlyStem,
    dayBranch: p.day.earthlyBranch,
    hourBranch: profile.birthTime ? p.hour.earthlyBranch : undefined,
    pillars,
    solar,
    lunar,
  };
}

const HAP6 = ['자축', '인해', '묘술', '진유', '사신', '오미'];
const SAMHAP = ['신자진', '해묘미', '인오술', '사유축'];
const CHUNG = ['자오', '축미', '인신', '묘유', '진술', '사해'];
const pair = (list: string[], a: string, b: string) => a !== b && list.some((p) => p.includes(a) && p.includes(b));

const TEN_GOD_GROUPS: [string, string[], Signals][] = [
  ['재성', ['편재', '정재'], { 재물: 1 }],
  ['관성', ['편관', '정관'], { 계약: 1 }],
  ['인성', ['편인', '정인'], { 종합: 1 }],
  ['비겁', ['비견', '겁재'], { 재물: -1 }],
];

// 수비학 개인일: 개인년(생일 월·일 + 올해) → 개인월(+ 이번 달) → 개인일(+ 오늘), 단계마다 한 자리로 줄인다
const digitSum = (n: number): number => (n < 10 ? n : digitSum(String(n).split('').reduce((a, c) => a + +c, 0)));
export const personalDay = (birth: YMD, date: YMD) =>
  digitSum(digitSum(digitSum(birth.month + birth.day + date.year) + date.month) + date.day);
const NUMEROLOGY: Record<number, [string, Signals]> = {
  1: ['시작', { 계약: 1 }], 2: ['협력', {}], 3: ['즐거움', { 종합: 1 }], 4: ['꾸준함', {}], 5: ['변화', { 이동: 1 }],
  6: ['집·가족', { 이동: 1 }], 7: ['쉼', { 계약: -1 }], 8: ['재물', { 재물: 1 }], 9: ['마무리', { 계약: -1 }],
};

export function personalRules(info: DayInfo, me: Saju): Rule[] {
  const out: Rule[] = [];
  const t = info.dayBranch;
  const zodiac = ZODIAC[me.yearBranch];

  if (pair(CHUNG, me.yearBranch, t)) out.push({ source: 'me', name: `띠(${zodiac})와 일진 충`, signals: { 종합: -2, 이동: -1 }, why: `${me.yearBranch}·${t} 충` });
  else if (pair(HAP6, me.yearBranch, t)) out.push({ source: 'me', name: `띠(${zodiac})와 일진 육합`, signals: { 종합: 1 }, why: `${me.yearBranch}·${t} 합` });
  else if (pair(SAMHAP, me.yearBranch, t)) out.push({ source: 'me', name: `띠(${zodiac})와 일진 삼합`, signals: { 종합: 1 }, why: `${me.yearBranch}·${t} 삼합` });

  if (pair(CHUNG, me.dayBranch, t)) out.push({ source: 'me', name: '일지와 일진 충', signals: { 종합: -1 }, why: `${me.dayBranch}·${t} 충` });
  else if (pair(HAP6, me.dayBranch, t)) out.push({ source: 'me', name: '일지와 일진 육합', signals: { 종합: 1 }, why: `${me.dayBranch}·${t} 합` });

  const god = getTenGod(me.dayStem as never, info.dayStem as never);
  for (const [group, gods, signals] of TEN_GOD_GROUPS) {
    if (gods.includes(god)) out.push({ source: 'me', name: `${group}일 (${god})`, signals, why: `일간 ${me.dayStem} 기준 ${info.dayStem}` });
  }

  if (me.hourBranch && pair(CHUNG, me.hourBranch, t)) out.push({ source: 'me', name: '시지와 일진 충', signals: { 종합: -1 }, why: `${me.hourBranch}·${t} 충` });

  const solarBday = me.solar.month === info.date.month && me.solar.day === info.date.day;
  const lunarBday = !me.lunar.isLeapMonth && !info.lunar.isLeapMonth && me.lunar.month === info.lunar.month && me.lunar.day === info.lunar.day;
  if (solarBday || lunarBday) out.push({ source: 'me', name: solarBday ? '양력 생일' : '음력 생일', signals: { 종합: 1 }, why: '생일' });

  const pd = personalDay(me.solar, info.date);
  out.push({ source: 'me', name: `수비학 개인일 ${pd} (${NUMEROLOGY[pd][0]})`, signals: NUMEROLOGY[pd][1], why: '생일 월·일 + 오늘 연·월·일의 숫자 합' });
  return out;
}
