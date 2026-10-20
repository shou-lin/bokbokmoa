#!/usr/bin/env node
// 복복모아 운세 계산 (PRD "규칙 범위"·"점수 계산"의 시제품)
// 사용법: node fortune.mjs [생년월일 [시각|모름]] [--lunar] [--leap] [--date YYYY-MM-DD] [--days N | --week]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { calculateFourPillars, solarToLunar, lunarToSolar, getTenGod } = require('manseryeok');

const FIELDS = ['종합', '이동', '계약', '재물'];
// 점수를 내는 나라. 서양 규칙은 점수에 넣지 않고 조심 알림으로만 보여준다
const COUNTRIES = [['🇰🇷', '한국'], ['🇯🇵', '일본'], ['🇹🇭', '태국'], ['🇲🇽', '마야']];
const ZODIAC = { 자: '쥐', 축: '소', 인: '호랑이', 묘: '토끼', 진: '용', 사: '뱀', 오: '말', 미: '양', 신: '원숭이', 유: '닭', 술: '개', 해: '돼지' };
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

// ---------- 입력 ----------
function parseArgs(argv) {
  const opts = { lunar: false, leap: false, date: null, days: 1, week: false, birth: null, time: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lunar') opts.lunar = true;
    else if (a === '--leap') opts.leap = true;
    else if (a === '--date') opts.date = argv[++i];
    else if (a === '--week') opts.week = true;
    else if (a === '--days') opts.days = Math.min(Math.max(parseInt(argv[++i], 10) || 1, 1), 31);
    else rest.push(a);
  }
  if (rest[0]) opts.birth = rest[0];
  if (rest[1] && !rest[1].includes('모름')) opts.time = rest[1];
  return opts;
}

function ymd(str, label) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str ?? '');
  if (!m) throw new Error(`${label}은 YYYY-MM-DD 형식이어야 합니다: ${str}`);
  return { year: +m[1], month: +m[2], day: +m[3] };
}

function todayKST() {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  return ymd(s, '오늘');
}

function addDays({ year, month, day }, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const fmt = ({ year, month, day }) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ---------- 날짜 정보 ----------
function dayInfo(date) {
  // 정오 기준으로 그날의 일진과 절기 월(월주)을 구한다
  const p = calculateFourPillars({ ...date, hour: 12, minute: 0 });
  const lunar = solarToLunar(date.year, date.month, date.day);
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return { date, lunar, weekday, dayStem: p.day.heavenlyStem, dayBranch: p.day.earthlyBranch, monthBranch: p.month.earthlyBranch };
}

// ---------- 공통 규칙 ----------
const ROKUYO = [
  { name: '대안', s: { 종합: 2, 계약: 2 } },
  { name: '적구', s: { 종합: -1, 계약: -1 } },
  { name: '선승', s: {} },
  { name: '우인', s: { 종합: 1, 계약: 1 } },
  { name: '선부', s: {} },
  { name: '불멸', s: { 종합: -2, 계약: -2 } },
];

// 불성취일: 구력 월별로 8일 간격 (1·7월 3일, 2·8월 2일, 3·9월 1일, 4·10월 4일, 5·11월 5일, 6·12월 6일 시작)
const FUJOJU_START = [3, 2, 1, 4, 5, 6];

// 일립만배일: 절기 월(월지)별 일지
const ICHIRYU = { 인: ['축', '오'], 묘: ['유', '인'], 진: ['자', '묘'], 사: ['묘', '진'], 오: ['사', '오'], 미: ['유', '오'], 신: ['자', '미'], 유: ['묘', '신'], 술: ['오', '유'], 해: ['유', '술'], 자: ['해', '자'], 축: ['묘', '자'] };

// 황도·흑도 12신: 월지별 청룡이 시작하는 일지, 순서대로 12신
const HWANGDO_START = { 인: '자', 신: '자', 묘: '인', 유: '인', 진: '진', 술: '진', 사: '오', 해: '오', 오: '신', 자: '신', 미: '술', 축: '술' };
const TWELVE_GODS = [
  ['청룡', true], ['명당', true], ['천형', false], ['주작', false], ['금궤', true], ['천덕', true],
  ['백호', false], ['옥당', true], ['천뢰', false], ['현무', false], ['사명', true], ['구진', false],
];

// 수성 역행 기간 (2026~2027, 공개 천문력 기준)
const MERCURY_RETRO = [
  ['2026-02-26', '2026-03-20'], ['2026-06-29', '2026-07-23'], ['2026-10-24', '2026-11-13'],
  ['2027-02-09', '2027-03-03'], ['2027-06-10', '2027-07-04'], ['2027-10-07', '2027-10-28'],
];

// 태국 กาลโยค: 송끄란 다음 날(4월 16일)부터 1년간 요일별로 정해진다 (0=일 … 6=토)
const THAI_KALAYOK = [
  { from: '2026-04-16', to: '2027-04-15', 승리: 6, 아티보디: 1, 우밧: 0, 로까위낫: 1 },
];
const WEEKDAYS = '일월화수목금토';

// 마야 촐킨: 260일 주기 (숫자 1~13 × 날 이름 20개). GMT 상관 상수 584283 기준 (2012-12-21 = 4 아하우)
const TZOLKIN = [
  ['이믹스', '악어·시작', { 계약: 1 }], ['이크', '바람', {}], ['악발', '밤', {}], ['칸', '씨앗', { 재물: 1 }],
  ['치크찬', '뱀', {}], ['키미', '죽음', { 종합: -1 }], ['마니크', '사슴', {}], ['라마트', '별·풍요', { 재물: 1 }],
  ['물루크', '물', {}], ['오크', '개', {}], ['추웬', '원숭이·창조', { 종합: 1 }], ['에브', '길', { 이동: 1 }],
  ['벤', '갈대·집', { 이동: 1 }], ['이스', '재규어', {}], ['멘', '독수리', {}], ['키브', '부엉이', {}],
  ['카반', '땅', {}], ['에츠나브', '부싯돌·결단', { 계약: 1 }], ['카와크', '폭풍', { 종합: -1 }], ['아하우', '태양', { 종합: 1 }],
];
const julianDay = ({ year, month, day }) => Math.floor(Date.UTC(year, month - 1, day) / 86400000) + 2440588;

function commonRules(info) {
  const out = [];
  const { lunar, date } = info;

  if (lunar.day % 10 === 9 || lunar.day % 10 === 0) {
    out.push({ country: '🇰🇷', name: '손 없는 날', s: { 이동: 2 }, why: `음력 ${lunar.day}일 (끝자리 9·0)` });
  }

  const startIdx = BRANCHES.indexOf(HWANGDO_START[info.monthBranch]);
  const god = TWELVE_GODS[(BRANCHES.indexOf(info.dayBranch) - startIdx + 12) % 12];
  out.push({
    country: '🇰🇷',
    name: god[1] ? `황도일 (${god[0]})` : `흑도일 (${god[0]})`,
    s: god[1] ? { 종합: 1, 계약: 1 } : { 종합: -1, 계약: -1 },
    why: `${info.monthBranch}월 ${info.dayBranch}일`,
  });

  const r = ROKUYO[(lunar.month + lunar.day) % 6];
  out.push({ country: '🇯🇵', name: `육요 ${r.name}`, s: r.s, why: `구력 ${lunar.month}월 ${lunar.day}일` });

  if (ICHIRYU[info.monthBranch].includes(info.dayBranch)) {
    out.push({ country: '🇯🇵', name: '일립만배일', s: { 재물: 2, 계약: 1 }, why: `${info.monthBranch}월의 ${info.dayBranch}일` });
  }

  const start = FUJOJU_START[(lunar.month - 1) % 6];
  if (lunar.day >= start && (lunar.day - start) % 8 === 0) {
    out.push({ country: '🇯🇵', name: '불성취일', s: { 계약: -2, 재물: -2 }, why: `구력 ${lunar.month}월 ${lunar.day}일` });
  }

  const d = fmt(date);
  const k = THAI_KALAYOK.find((y) => y.from <= d && d <= y.to);
  if (k) {
    const why = `${k.from.slice(0, 4)}년 กาลโยค, ${WEEKDAYS[info.weekday]}요일`;
    if (info.weekday === k.승리) out.push({ country: '🇹🇭', name: '완통차이 (승리의 날)', s: { 종합: 2, 계약: 1 }, why });
    if (info.weekday === k.아티보디) out.push({ country: '🇹🇭', name: '완아티보디 (버금 길일)', s: { 종합: 1 }, why });
    if (info.weekday === k.우밧) out.push({ country: '🇹🇭', name: '완우밧 (흉일)', s: { 종합: -1, 계약: -1 }, why });
    if (info.weekday === k.로까위낫) out.push({ country: '🇹🇭', name: '완로까위낫 (대흉일)', s: { 종합: -2 }, why });
  }

  const k260 = julianDay(date) - 584283;
  const [mayaName, mayaMeaning, mayaSignal] = TZOLKIN[((k260 + 19) % 20 + 20) % 20];
  const mayaNumber = ((k260 + 3) % 13 + 13) % 13 + 1;
  out.push({ country: '🇲🇽', name: `촐킨 ${mayaNumber} ${mayaName} (${mayaMeaning})`, s: mayaSignal, why: '마야 260일 달력' });

  // 서양: 점수 없이 조심 알림만
  if (date.day === 13 && info.weekday === 5) {
    out.push({ country: '🇺🇸', alert: true, name: '13일의 금요일', s: {}, why: '양력 13일 + 금요일' });
  }
  const retro = MERCURY_RETRO.find(([a, b]) => a <= d && d <= b);
  if (retro) out.push({ country: '🇺🇸', alert: true, name: '수성 역행', s: {}, why: `${retro[0]} ~ ${retro[1]}, 계약·연락 실수 주의` });

  return out;
}

// ---------- 개인 규칙 ----------
const HAP6 = ['자축', '인해', '묘술', '진유', '사신', '오미'];
const SAMHAP = ['신자진', '해묘미', '인오술', '사유축'];
const CHUNG = ['자오', '축미', '인신', '묘유', '진술', '사해'];
const pair = (list, a, b) => list.some((p) => p.includes(a) && p.includes(b) && a !== b);
const isSamhap = (a, b) => a !== b && SAMHAP.some((g) => g.includes(a) && g.includes(b));

function profileOf(opts) {
  const birth = ymd(opts.birth, '생년월일');
  const [hour, minute] = opts.time ? opts.time.split(':').map(Number) : [12, 0];
  const p = calculateFourPillars({ ...birth, hour, minute, isLunar: opts.lunar, isLeapMonth: opts.leap });
  const solar = opts.lunar ? lunarToSolar(birth.year, birth.month, birth.day, opts.leap) : birth;
  const lunar = opts.lunar ? { ...birth, isLeapMonth: opts.leap } : solarToLunar(birth.year, birth.month, birth.day);
  return { pillars: p, hasTime: Boolean(opts.time), solar, lunar };
}

// 수비학 개인일: 개인년(생일 월·일 + 올해) → 개인월(+ 이번 달) → 개인일(+ 오늘), 각 단계에서 한 자리로 줄인다
const digitSum = (n) => (n < 10 ? n : digitSum(String(n).split('').reduce((a, c) => a + +c, 0)));
const personalDay = (birth, date) => digitSum(digitSum(digitSum(birth.month + birth.day + date.year) + date.month) + date.day);
const NUMEROLOGY = {
  1: ['시작', { 계약: 1 }], 2: ['협력', {}], 3: ['즐거움', { 종합: 1 }], 4: ['꾸준함', {}], 5: ['변화', { 이동: 1 }],
  6: ['집·가족', { 이동: 1 }], 7: ['쉼', { 계약: -1 }], 8: ['재물', { 재물: 1 }], 9: ['마무리', { 계약: -1 }],
};

function personalRules(info, me) {
  const out = [];
  const yb = me.pillars.year.earthlyBranch;
  const db = me.pillars.day.earthlyBranch;
  const ds = me.pillars.day.heavenlyStem;
  const t = info.dayBranch;

  if (pair(CHUNG, yb, t)) out.push({ name: `띠(${ZODIAC[yb]})와 일진 충`, s: { 종합: -2, 이동: -1 }, why: `${yb}·${t} 충` });
  else if (pair(HAP6, yb, t)) out.push({ name: `띠(${ZODIAC[yb]})와 일진 육합`, s: { 종합: 1 }, why: `${yb}·${t} 합` });
  else if (isSamhap(yb, t)) out.push({ name: `띠(${ZODIAC[yb]})와 일진 삼합`, s: { 종합: 1 }, why: `${yb}·${t} 삼합` });

  if (pair(CHUNG, db, t)) out.push({ name: '일지와 일진 충', s: { 종합: -1 }, why: `${db}·${t} 충` });
  else if (pair(HAP6, db, t)) out.push({ name: '일지와 일진 육합', s: { 종합: 1 }, why: `${db}·${t} 합` });

  const god = getTenGod(ds, info.dayStem);
  const GROUPS = {
    재성: [['편재', '정재'], { 재물: 1 }],
    관성: [['편관', '정관'], { 계약: 1 }],
    인성: [['편인', '정인'], { 종합: 1 }],
    비겁: [['비견', '겁재'], { 재물: -1 }],
  };
  for (const [group, [gods, s]] of Object.entries(GROUPS)) {
    if (gods.includes(god)) out.push({ name: `${group}일 (${god})`, s, why: `일간 ${ds} 기준 ${info.dayStem}` });
  }

  if (me.hasTime && pair(CHUNG, me.pillars.hour.earthlyBranch, t)) {
    out.push({ name: '시지와 일진 충', s: { 종합: -1 }, why: `${me.pillars.hour.earthlyBranch}·${t} 충` });
  }

  const solarBday = me.solar.month === info.date.month && me.solar.day === info.date.day;
  const lunarBday = !me.lunar.isLeapMonth && me.lunar.month === info.lunar.month && me.lunar.day === info.lunar.day && !info.lunar.isLeapMonth;
  if (solarBday || lunarBday) out.push({ name: solarBday ? '양력 생일' : '음력 생일', s: { 종합: 1 }, why: '생일' });

  const pd = personalDay(me.solar, info.date);
  out.push({ name: `수비학 개인일 ${pd} (${NUMEROLOGY[pd][0]})`, s: NUMEROLOGY[pd][1], why: '생일 월·일 + 오늘 연·월·일의 숫자 합' });

  return out;
}

// ---------- 점수 ----------
function sumSignals(rules) {
  const s = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  for (const r of rules) for (const [f, v] of Object.entries(r.s)) s[f] += v;
  return s;
}

// 기준 70점, 신호 1당 8점, 40~100점. 나쁜 날도 40점 밑으로는 내려가지 않는다
const BASE = 70;
const STEP = 8;
const FLOOR = 40;

function score(signals) {
  // 종합 = 종합 신호 + 나머지 분야 평균
  const toScore = (x) => Math.max(FLOOR, Math.min(100, Math.round(BASE + x * STEP)));
  const fields = Object.fromEntries(FIELDS.map((f) => [f, toScore(signals[f])]));
  fields.종합 = toScore(signals.종합 + (signals.이동 + signals.계약 + signals.재물) / 3);
  return fields;
}

const average = (scores) => Object.fromEntries(FIELDS.map((f) => [f, Math.round(scores.reduce((a, s) => a + s[f], 0) / scores.length)]));

// 출처별 점수와 평균 점수는 폭이 달라 등급 경계를 따로 둔다.
// 평균 경계는 2026-04-16~2027-04-15 일반 모드에서 좋음 약 27%, 조심 약 17%가 나오는 값
const grade = (x) => (x >= GOOD ? '좋음' : x <= CAREFUL ? '조심' : '보통');
const gradeAvg = (x) => (x >= AVG_GOOD ? '좋음' : x <= AVG_CAREFUL ? '조심' : '보통');
const GOOD = 82;
const CAREFUL = 56;
const AVG_GOOD = 74;
const AVG_CAREFUL = 65;

function conflicts(rules) {
  return FIELDS.filter((f) => rules.some((r) => (r.s[f] ?? 0) > 0) && rules.some((r) => (r.s[f] ?? 0) < 0));
}

const thaiCovered = (date) => THAI_KALAYOK.some((y) => y.from <= fmt(date) && fmt(date) <= y.to);

// ---------- 출력 ----------
const sig = (s) => Object.entries(s).map(([f, v]) => `${f} ${v > 0 ? '+' : '−'}${Math.abs(v)}`).join(', ') || '신호 없음';
const cell = (x) => `${x} ${grade(x)}`;
const avgCell = (x) => `**${x} ${gradeAvg(x)}**`;

// 그날의 출처별 점수 [이름, 분야별 점수] 목록과, 출력할 글을 만든다
function report(date, me) {
  const info = dayInfo(date);
  const common = commonRules(info);
  const scored = common.filter((r) => !r.alert);
  const alerts = common.filter((r) => r.alert);
  const lines = [];
  lines.push(`## ${fmt(date)} (${WEEKDAYS[info.weekday]}) · 음력 ${info.lunar.isLeapMonth ? '윤' : ''}${info.lunar.month}월 ${info.lunar.day}일 · 일진 ${info.dayStem}${info.dayBranch}`);
  lines.push('');
  lines.push('나라별 규칙:');
  for (const r of scored) lines.push(`- ${r.country} ${r.name}: ${sig(r.s)} (${r.why})`);

  let personal = [];
  let ps = null;
  if (me) {
    personal = personalRules(info, me);
    ps = sumSignals(personal);
    for (const f of FIELDS) ps[f] = Math.max(-2, Math.min(2, ps[f])); // 개인 규칙 분야별 ±2 제한
    lines.push('');
    lines.push('나와의 궁합:');
    if (personal.length === 0) lines.push('- 해당 없음');
    for (const r of personal) lines.push(`- ${r.name}: ${sig(r.s)} (${r.why})`);
  }

  if (alerts.length) {
    lines.push('');
    lines.push('조심 알림 (점수에 넣지 않음):');
    for (const r of alerts) lines.push(`- ${r.country} ${r.name} (${r.why})`);
  }

  // 출처별 점수: 나라(와 사주)마다 따로 100점 만점으로 계산하고, 평균을 함께 보여준다
  const countries = COUNTRIES
    .filter(([flag]) => flag !== '🇹🇭' || thaiCovered(date))
    .map(([flag, label]) => [`${flag} ${label}`, score(sumSignals(scored.filter((r) => r.country === flag)))]);
  const sources = me ? [...countries, ['🙋 나 (사주·수비학)', score(ps)]] : countries;
  const avgLabel = me ? '나 평균' : '평균';
  const avg = average(sources.map(([, s]) => s));
  lines.push('');
  lines.push(`| 출처 | ${FIELDS.join(' | ')} |`);
  lines.push(`| --- |${' --- |'.repeat(FIELDS.length)}`);
  for (const [label, s] of sources) lines.push(`| ${label} | ${FIELDS.map((f) => cell(s[f])).join(' | ')} |`);
  lines.push(`| **${avgLabel}** | ${FIELDS.map((f) => avgCell(avg[f])).join(' | ')} |`);
  if (!thaiCovered(date)) lines.push('', '(태국 กาลโยค 자료가 없는 날이라 태국 점수는 빠짐)');

  const c = conflicts([...scored, ...personal]);
  if (c.length) lines.push('', `엇갈림: ${c.join('·')} 분야에 + 신호와 − 신호가 함께 있음`);
  return { text: lines.join('\n'), sources: [...sources, [`**${avgLabel}**`, avg]] };
}

// 기간 점수: 출처마다 날짜별 점수를 평균 낸다
function periodSummary(days) {
  const labels = [...new Set(days.flatMap((d) => d.sources.map(([l]) => l)))];
  const lines = ['## 기간 점수 (날짜별 점수의 평균, 100점 만점)', '', `| 출처 | ${FIELDS.join(' | ')} |`, `| --- |${' --- |'.repeat(FIELDS.length)}`];
  for (const label of labels) {
    const s = average(days.flatMap((d) => d.sources.filter(([l]) => l === label).map(([, x]) => x)));
    lines.push(`| ${label} | ${FIELDS.map((f) => s[f]).join(' | ')} |`);
  }
  return lines.join('\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const me = opts.birth ? profileOf(opts) : null;
  const out = [];

  if (me) {
    const p = me.pillars;
    const yb = p.year.earthlyBranch;
    const four = [p.year, p.month, p.day].map((x) => x.heavenlyStem + x.earthlyBranch);
    if (me.hasTime) four.push(p.hour.heavenlyStem + p.hour.earthlyBranch);
    out.push(`# 내 사주: ${ZODIAC[yb]}띠 · 일주 ${four[2]} · 일간 ${p.day.heavenlyStem}`);
    out.push(`사주: ${four.join(' ')}${me.hasTime ? '' : ' (시주는 시간 모름으로 생략)'} · 양력 생일 ${fmt(me.solar)}`);
  } else {
    out.push('# 일반 모드 (생년월일 없음)');
  }
  out.push('');

  let start = opts.date ? ymd(opts.date, '날짜') : todayKST();
  let count = opts.days;
  if (opts.week) {
    // 그 주의 월요일부터 일요일까지
    const wd = new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay();
    start = addDays(start, -((wd + 6) % 7));
    count = 7;
  }
  const days = [];
  for (let i = 0; i < count; i++) {
    const r = report(addDays(start, i), me);
    days.push(r);
    out.push(r.text, '');
  }
  if (days.length > 1) out.push(periodSummary(days), '');
  out.push('> 점수는 확률이 아니라 운의 흐름을 재미로 보여주는 것이며, 어떤 결과도 보장하지 않습니다.');
  console.log(out.join('\n'));
}

try {
  main();
} catch (e) {
  console.error(`오류: ${e.message}`);
  process.exit(1);
}
