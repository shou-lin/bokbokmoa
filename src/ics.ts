// 일정을 iOS·구글 캘린더에 넣을 수 있는 .ics(iCalendar, RFC 5545) 파일로 만든다
import type { Schedule } from './storage';

/** 텍스트 값의 특수문자 이스케이프 */
export const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** 한 줄이 75바이트를 넘으면 접는다 (한글은 3바이트라 글자 단위로 자른다) */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // 이어지는 줄은 앞에 공백 1바이트가 붙는다
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const compactDate = (iso: string) => iso.replace(/-/g, '');
const nextDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildIcs(s: Pick<Schedule, 'id' | 'title' | 'date'>, description: string, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BokBokMoa//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${s.id}@bokbokmoa`,
    `DTSTAMP:${stamp(now)}`,
    // 하루 종일 일정: 끝 날짜는 다음 날(포함하지 않음)
    `DTSTART;VALUE=DATE:${compactDate(s.date)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(s.date))}`,
    `SUMMARY:${escapeText(s.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'TRANSP:TRANSPARENT',
    // 전날 오전 9시에 알림
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`내일은 ${s.title}`)}`,
    'TRIGGER:-PT15H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** 파일을 연다. iPhone·iPad 사파리는 text/calendar를 열면 "캘린더에 추가" 화면을 보여준다 */
export function openIcs(ics: string, filename: string) {
  const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isApple) {
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    return;
  }
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
