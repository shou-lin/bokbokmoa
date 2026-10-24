import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, fold } from './ics';

describe('.ics 파일', () => {
  const ics = buildIcs({ id: 'abc', title: '새집 이사', date: '2026-10-29' }, '이동 평균 73점 (좋음)\n한국 · 손 없는 날', new Date('2026-10-24T12:00:00Z'));

  it('하루 종일 일정으로 만든다 (끝 날짜는 다음 날)', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261029');
    expect(ics).toContain('DTEND;VALUE=DATE:20261030');
    expect(ics).toContain('SUMMARY:새집 이사');
    expect(ics).toContain('DTSTAMP:20261024T120000Z');
  });

  it('월말·연말도 다음 날로 넘어간다', () => {
    expect(buildIcs({ id: 'x', title: 't', date: '2026-12-31' }, '')).toContain('DTEND;VALUE=DATE:20270101');
  });

  it('줄바꿈·쉼표·세미콜론을 이스케이프한다', () => {
    expect(escapeText('a,b;c\nd\\e')).toBe('a\\,b\\;c\\nd\\\\e');
  });

  it('75바이트가 넘는 줄은 글자를 깨뜨리지 않고 접는다', () => {
    const long = 'DESCRIPTION:' + '가'.repeat(60);
    const folded = fold(long);
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n ').join('')).toBe(long);
  });

  it('줄 끝은 CRLF', () => {
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
