// 나라별 날짜 규칙 (PRD "규칙 범위"). 규칙 하나는 조건 → 분야별 신호 → 설명으로 이루어진다.
import { type DayInfo, fmt, julianDay, WEEKDAYS } from './date';

export const FIELDS = ['종합', '이동', '계약', '재물'] as const;
export type Field = (typeof FIELDS)[number];
export type Signals = Partial<Record<Field, number>>;

export type SourceId = 'kr' | 'jp' | 'th' | 'maya' | 'me';

export interface Rule {
  source: SourceId | 'west';
  name: string;
  signals: Signals;
  why: string;
  /** 서양 규칙처럼 점수에 넣지 않고 조심 알림으로만 보여주는 규칙 */
  alert?: boolean;
}

export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

// ---------- 한국 ----------
// 황도·흑도 12신: 월지별로 청룡이 시작하는 일지
const HWANGDO_START: Record<string, string> = { 인: '자', 신: '자', 묘: '인', 유: '인', 진: '진', 술: '진', 사: '오', 해: '오', 오: '신', 자: '신', 미: '술', 축: '술' };
const TWELVE_GODS: [string, boolean][] = [
  ['청룡', true], ['명당', true], ['천형', false], ['주작', false], ['금궤', true], ['천덕', true],
  ['백호', false], ['옥당', true], ['천뢰', false], ['현무', false], ['사명', true], ['구진', false],
];

function korea(info: DayInfo): Rule[] {
  const out: Rule[] = [];
  const d = info.lunar.day;
  if (d % 10 === 9 || d % 10 === 0) {
    out.push({ source: 'kr', name: '손 없는 날', signals: { 이동: 2 }, why: `음력 ${d}일 (끝자리 9·0)` });
  }
  const start = BRANCHES.indexOf(HWANGDO_START[info.monthBranch]);
  const [god, good] = TWELVE_GODS[(BRANCHES.indexOf(info.dayBranch) - start + 12) % 12];
  out.push({
    source: 'kr',
    name: good ? `황도일 (${god})` : `흑도일 (${god})`,
    signals: good ? { 종합: 1, 계약: 1 } : { 종합: -1, 계약: -1 },
    why: `${info.monthBranch}월 ${info.dayBranch}일`,
  });
  return out;
}

// ---------- 일본 ----------
const ROKUYO: [string, Signals][] = [
  ['대안', { 종합: 2, 계약: 2 }],
  ['적구', { 종합: -1, 계약: -1 }],
  ['선승', {}],
  ['우인', { 종합: 1, 계약: 1 }],
  ['선부', {}],
  ['불멸', { 종합: -2, 계약: -2 }],
];
// 불성취일: 구력 월별로 8일 간격 (1·7월 3일, 2·8월 2일, 3·9월 1일, 4·10월 4일, 5·11월 5일, 6·12월 6일 시작)
const FUJOJU_START = [3, 2, 1, 4, 5, 6];
// 일립만배일: 절기 월(월지)별 일지
const ICHIRYU: Record<string, string[]> = { 인: ['축', '오'], 묘: ['유', '인'], 진: ['자', '묘'], 사: ['묘', '진'], 오: ['사', '오'], 미: ['유', '오'], 신: ['자', '미'], 유: ['묘', '신'], 술: ['오', '유'], 해: ['유', '술'], 자: ['해', '자'], 축: ['묘', '자'] };

function japan(info: DayInfo): Rule[] {
  const { month, day } = info.lunar;
  const [name, signals] = ROKUYO[(month + day) % 6];
  const out: Rule[] = [{ source: 'jp', name, signals, why: `육요 · 구력 ${month}월 ${day}일` }];
  if (ICHIRYU[info.monthBranch].includes(info.dayBranch)) {
    out.push({ source: 'jp', name: '일립만배일', signals: { 재물: 2, 계약: 1 }, why: `${info.monthBranch}월의 ${info.dayBranch}일` });
  }
  const start = FUJOJU_START[(month - 1) % 6];
  if (day >= start && (day - start) % 8 === 0) {
    out.push({ source: 'jp', name: '불성취일', signals: { 계약: -2, 재물: -2 }, why: `구력 ${month}월 ${day}일` });
  }
  return out;
}

// ---------- 태국 ----------
// กาลโยค: 송끄란 다음 날(4월 16일)부터 1년간 요일별로 정해진다 (0=일 … 6=토)
export const THAI_KALAYOK = [{ from: '2026-04-16', to: '2027-04-15', 승리: 6, 아티보디: 1, 우밧: 0, 로까위낫: 1 }];

export const thaiCovered = (info: DayInfo) => THAI_KALAYOK.some((y) => y.from <= fmt(info.date) && fmt(info.date) <= y.to);

function thailand(info: DayInfo): Rule[] {
  const d = fmt(info.date);
  const k = THAI_KALAYOK.find((y) => y.from <= d && d <= y.to);
  if (!k) return [];
  const why = `${k.from.slice(0, 4)}년 กาลโยค · ${WEEKDAYS[info.weekday]}요일`;
  const out: Rule[] = [];
  if (info.weekday === k.승리) out.push({ source: 'th', name: '승리의 날 (완통차이)', signals: { 종합: 2, 계약: 1 }, why });
  if (info.weekday === k.아티보디) out.push({ source: 'th', name: '버금 길일 (완아티보디)', signals: { 종합: 1 }, why });
  if (info.weekday === k.우밧) out.push({ source: 'th', name: '흉일 (완우밧)', signals: { 종합: -1, 계약: -1 }, why });
  if (info.weekday === k.로까위낫) out.push({ source: 'th', name: '대흉일 (완로까위낫)', signals: { 종합: -2 }, why });
  return out;
}

// ---------- 마야 ----------
// 촐킨: 숫자 1~13 × 날 이름 20개의 260일 주기. GMT 상관 상수 584283 기준 (2012-12-21 = 4 아하우)
const TZOLKIN: [string, string, Signals][] = [
  ['이믹스', '악어·시작', { 계약: 1 }], ['이크', '바람', {}], ['악발', '밤', {}], ['칸', '씨앗', { 재물: 1 }],
  ['치크찬', '뱀', {}], ['키미', '죽음', { 종합: -1 }], ['마니크', '사슴', {}], ['라마트', '별·풍요', { 재물: 1 }],
  ['물루크', '물', {}], ['오크', '개', {}], ['추웬', '원숭이·창조', { 종합: 1 }], ['에브', '길', { 이동: 1 }],
  ['벤', '갈대·집', { 이동: 1 }], ['이스', '재규어', {}], ['멘', '독수리', {}], ['키브', '부엉이', {}],
  ['카반', '땅', {}], ['에츠나브', '부싯돌·결단', { 계약: 1 }], ['카와크', '폭풍', { 종합: -1 }], ['아하우', '태양', { 종합: 1 }],
];

export function tzolkin(info: DayInfo) {
  const k = julianDay(info.date) - 584283;
  const [name, meaning, signals] = TZOLKIN[(((k + 19) % 20) + 20) % 20];
  return { number: ((((k + 3) % 13) + 13) % 13) + 1, name, meaning, signals };
}

function maya(info: DayInfo): Rule[] {
  const t = tzolkin(info);
  return [{ source: 'maya', name: `${t.number} ${t.name} (${t.meaning})`, signals: t.signals, why: '촐킨 260일 달력 · 날 이름의 뜻에 따른 해석' }];
}

// ---------- 서양 (조심 알림만) ----------
const MERCURY_RETRO = [
  ['2026-02-26', '2026-03-20'], ['2026-06-29', '2026-07-23'], ['2026-10-24', '2026-11-13'],
  ['2027-02-09', '2027-03-03'], ['2027-06-10', '2027-07-04'], ['2027-10-07', '2027-10-28'],
];

function west(info: DayInfo): Rule[] {
  const out: Rule[] = [];
  if (info.date.day === 13 && info.weekday === 5) {
    out.push({ source: 'west', alert: true, name: '13일의 금요일', signals: {}, why: '서양에서는 조심하는 날' });
  }
  const d = fmt(info.date);
  const retro = MERCURY_RETRO.find(([a, b]) => a <= d && d <= b);
  if (retro) out.push({ source: 'west', alert: true, name: '수성 역행', signals: {}, why: `${retro[0]} ~ ${retro[1]} · 계약·연락 실수 주의` });
  return out;
}

export const commonRules = (info: DayInfo): Rule[] => [...korea(info), ...japan(info), ...thailand(info), ...maya(info), ...west(info)];
