import { describe, expect, it } from 'vitest';
import { addDays, dayInfo, parseYMD } from './date';
import { personalDay, sajuOf } from './personal';
import { commonRules, tzolkin } from './rules';
import { gradeOfAverage, scoreDay, scoreRange } from './score';

const names = (date: string) => commonRules(dayInfo(parseYMD(date))).map((r) => r.name);

describe('일본 규칙 (일본 길일 달력 bestcalendar.jp 2026년 1월과 대조)', () => {
  it('1월 1일은 대안 + 일립만배일 + 불성취일, 1월 2일은 적구 + 일립만배일', () => {
    expect(names('2026-01-01')).toEqual(expect.arrayContaining(['대안', '일립만배일', '불성취일']));
    expect(names('2026-01-02')).toEqual(expect.arrayContaining(['적구', '일립만배일']));
  });

  it('1월의 대안은 1·7·13·24·30일, 불성취일은 1·9·17·24일', () => {
    const jan = scoreRange(parseYMD('2026-01-01'), 31);
    const days = (name: string) => jan.filter((d) => d.sources.some((s) => s.rules.some((r) => r.name === name))).map((d) => d.info.date.day);
    expect(days('대안')).toEqual([1, 7, 13, 24, 30]);
    expect(days('불성취일')).toEqual([1, 9, 17, 24]);
  });
});

describe('한국·태국·마야·서양 규칙', () => {
  it('음력 끝자리 9·0인 날은 손 없는 날', () => {
    expect(dayInfo(parseYMD('2026-10-20')).lunar.day).toBe(10);
    expect(names('2026-10-20')).toContain('손 없는 날');
    expect(names('2026-10-21')).not.toContain('손 없는 날');
  });

  it('2026-04-16 ~ 2027-04-15 태국은 토요일이 승리의 날, 표 밖의 날은 태국 점수를 뺀다', () => {
    expect(names('2026-10-24')).toContain('승리의 날 (완통차이)');
    expect(scoreDay(parseYMD('2026-03-02')).sources.map((s) => s.id)).not.toContain('th');
  });

  it('촐킨은 2012-12-21이 4 아하우', () => {
    const t = tzolkin(dayInfo(parseYMD('2012-12-21')));
    expect([t.number, t.name]).toEqual([4, '아하우']);
  });

  it('서양 규칙은 점수 없이 조심 알림으로만 나온다', () => {
    const r = scoreDay(parseYMD('2026-11-13'));
    expect(r.alerts.map((a) => a.name)).toEqual(['13일의 금요일', '수성 역행']);
    expect(r.sources.flatMap((s) => s.rules).some((x) => x.source === 'west')).toBe(false);
  });
});

describe('점수 (/fortune 스킬 결과와 같은 값)', () => {
  it('2026-10-24 일반 모드: 한국 59 · 일본 49 · 태국 89 · 마야 70 → 평균 67', () => {
    const r = scoreDay(parseYMD('2026-10-24'));
    expect(r.sources.map((s) => [s.id, s.scores.종합])).toEqual([['kr', 59], ['jp', 49], ['th', 89], ['maya', 70]]);
    expect(r.average.종합).toBe(67);
    expect(r.conflicts).toEqual(['종합', '계약']);
  });

  it('점수는 40~100점 안에 있다', () => {
    for (const d of scoreRange(parseYMD('2026-04-16'), 365)) {
      for (const s of d.sources) for (const v of Object.values(s.scores)) expect(v).toBeGreaterThanOrEqual(40);
    }
  });

  it('평균 등급 경계: 74 이상 좋음, 65 이하 조심', () => {
    expect([gradeOfAverage(74), gradeOfAverage(73), gradeOfAverage(66), gradeOfAverage(65)]).toEqual(['좋음', '보통', '보통', '조심']);
  });
});

describe('사주 (manseryeok README 예시와 대조)', () => {
  it('음력 1992-09-29 05:30 → 임신 경술 계유 을묘', () => {
    expect(sajuOf({ birthDate: '1992-09-29', calendar: 'lunar', isLeapMonth: false, birthTime: '05:30' }).pillars).toEqual(['임신', '경술', '계유', '을묘']);
  });

  it('시간 모름이면 시주 없이 세 기둥만', () => {
    expect(sajuOf({ birthDate: '1993-02-28', calendar: 'solar', isLeapMonth: false }).pillars).toHaveLength(3);
  });

  it('수비학 개인일: 1993-02-28생의 2026-10-20은 7', () => {
    expect(personalDay({ year: 1993, month: 2, day: 28 }, { year: 2026, month: 10, day: 20 })).toBe(7);
  });

  it('개인 모드에서는 나 점수가 다섯 번째 출처로 들어간다', () => {
    const me = sajuOf({ birthDate: '2001-12-01', calendar: 'solar', isLeapMonth: false, birthTime: '02:52' });
    expect(scoreDay(parseYMD('2026-10-24'), me).sources.map((s) => s.id)).toEqual(['kr', 'jp', 'th', 'maya', 'me']);
  });
});

describe('edge case: 윤달', () => {
  it('윤6월이 있는 2025년 7~8월도 빈칸 없이 하루씩 계산된다', () => {
    const days = scoreRange(parseYMD('2025-07-20'), 40);
    expect(days.some((d) => d.info.lunar.isLeapMonth)).toBe(true);
    expect(days.every((d, i) => d.info.date.day === addDays(parseYMD('2025-07-20'), i).day)).toBe(true);
  });

  it('음력 윤4월 1일(2020)생은 양력 2020-05-23', () => {
    expect(sajuOf({ birthDate: '2020-04-01', calendar: 'lunar', isLeapMonth: true }).solar).toEqual({ year: 2020, month: 5, day: 23 });
  });
});

describe('edge case: 사주 경계', () => {
  it('입춘(2024-02-04 17:27) 전에 태어나면 토끼띠, 후에 태어나면 용띠', () => {
    expect(sajuOf({ birthDate: '2024-02-04', calendar: 'solar', isLeapMonth: false, birthTime: '10:00' }).pillars[0]).toBe('계묘');
    expect(sajuOf({ birthDate: '2024-02-04', calendar: 'solar', isLeapMonth: false, birthTime: '20:00' }).pillars[0]).toBe('갑진');
  });

  it('밤 11시 반 출생도 날은 자정에 바뀐다 (정자시)', () => {
    const late = sajuOf({ birthDate: '2024-03-10', calendar: 'solar', isLeapMonth: false, birthTime: '23:30' });
    expect(late.pillars[2]).toBe('계유');
  });
});
