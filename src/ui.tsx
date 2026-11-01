// Figma 복복모아 컴포넌트와 같은 이름의 화면 부품
import type React from 'react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { type DayResult, type Field, type Grade, gradeOf, gradeOfAverage, type Rule, SOURCES } from './fortune/score';
import { type IconName, PixelIcon } from './pixel';
import type { Schedule } from './storage';

export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`sheet ${className}`}>{children}</section>;
}

const markClass = { 좋음: 'mark-good', 보통: '', 조심: 'mark-careful' } as const;

/** grade를 주면 점수 대신 그 등급으로 표시한다 (좋은 날 찾기의 기간 내 순위처럼) */
export function ScoreLine({ label, value, average = false, grade: forced, icon }: { label: string; value: number; average?: boolean; grade?: Grade; icon?: IconName }) {
  const grade = forced ?? (average ? gradeOfAverage(value) : gradeOf(value));
  return (
    <div className="score-line" data-grade={grade}>
      <span className="label">
        {icon && <PixelIcon name={icon} size={2} className="row-icon" />}
        {label}
      </span>
      {/* 미니멀·픽셀 디자인에서만 보이는 점수 막대 */}
      <span className="meter" aria-hidden="true" style={{ '--v': `${value}%` } as React.CSSProperties} />
      <span className={`value ${markClass[grade]}`}>
        {value}점<span className="sr-only"> {grade}</span>
      </span>
    </div>
  );
}

/** 아이폰·아이패드 세로의 아래 시트: 열리면 초점을 옮기고, Esc·닫기로 닫고, 닫으면 초점을 돌려준다 */
export function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close.current();
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) return;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <div ref={ref} className="bottom-sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <button type="button" className="sheet-close" onClick={onClose}>
          닫기
        </button>
        {children}
      </div>
    </div>
  );
}

/** 일정을 저장한 뒤 보여주는 확인. 캘린더 파일은 버튼을 눌렀을 때만 받는다 */
export function SavedNote({ saved, onExport }: { saved: Schedule | null; onExport: (s: Schedule) => void }) {
  return (
    <div role="status">
      {saved && (
        <>
          <p className="h-body title-ink">
            ★ {saved.date.slice(5).replace('-', '/')} {saved.title} 적었어요
          </p>
          <button className="btn secondary" type="button" onClick={() => onExport(saved)}>
            캘린더에 넣기
          </button>
        </>
      )}
    </div>
  );
}

export function Sticky({ title, detail, tone = 'yellow' }: { title: string; detail: string; tone?: 'yellow' | 'pink' | 'blue' }) {
  return (
    <div className={`sticky ${tone === 'yellow' ? '' : tone}`}>
      <div className="t">{title}</div>
      <div className="d">{detail}</div>
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Disclaimer() {
  return <p className="ui-caption disclaimer">점수는 확률이 아니라 운의 흐름을 재미로 보여주는 것이며, 어떤 결과도 보장하지 않습니다.</p>;
}

export const signalText = (r: Rule) =>
  Object.entries(r.signals)
    .map(([f, v]) => `${f} ${v > 0 ? '+' : '−'}${Math.abs(v)}`)
    .join(' · ');

/** 출처 이름 옆에 붙일 대표 규칙: 신호가 가장 큰 규칙 */
export function leadRule(rules: Rule[]): Rule | undefined {
  const weight = (r: Rule) => Object.values(r.signals).reduce((a, v) => a + Math.abs(v), 0);
  return [...rules].filter((r) => weight(r) > 0).sort((a, b) => weight(b) - weight(a))[0];
}

/** 출처별 점수 줄 */
export function SourceLines({ day, field }: { day: DayResult; field: Field }) {
  return (
    <div>
      {day.sources.map((s) => {
        const lead = leadRule(s.rules);
        const label = s.id === 'me' ? '나 (사주·수비학)' : `${SOURCES[s.id].label}${lead ? ` · ${shortName(lead.name)}` : ''}`;
        return <ScoreLine key={s.id} icon={s.id} label={label} value={s.scores[field]} />;
      })}
    </div>
  );
}

export const shortName = (name: string) => name.replace(/ \(.+\)$/, '');

/** 받침이 있으면 withFinal(은·이), 없으면 withoutFinal(는·가) */
export function josa(word: string, withFinal: string, withoutFinal: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? withFinal : withoutFinal;
}

export const sourceLabel = (source: string) => (source === 'me' ? '나' : SOURCES[source as keyof typeof SOURCES]?.label ?? source);

/** 한 줄 요약: 규칙 결과로 만든 고정 문장 */
export function summaryOf(day: DayResult): string {
  const a = day.average;
  const fields: Field[] = ['이동', '계약', '재물'];
  const best = fields.reduce((x, y) => (a[y] > a[x] ? y : x));
  const worst = fields.reduce((x, y) => (a[y] < a[x] ? y : x));
  const good = gradeOfAverage(a[best]) === '좋음';
  const bad = gradeOfAverage(a[worst]) === '조심' || a[worst] < 68;
  if (good && bad && best !== worst) return `${best}은 좋고, ${worst}은 조심하는 날`;
  if (good) return `${best}에 좋은 흐름이 있는 날`;
  if (bad) return `${worst}은 한 번 더 살펴보는 날`;
  if (day.conflicts.length) return '나라마다 엇갈리는 날';
  return '무난하게 흘러가는 날';
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}
