// Figma 복복모아 컴포넌트와 같은 이름의 화면 부품
import { useEffect, useState, type ReactNode } from 'react';
import { type DayResult, type Field, gradeOf, gradeOfAverage, type Rule, SOURCES } from './fortune/score';

export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`sheet ${className}`}>{children}</section>;
}

const markClass = { 좋음: 'mark-good', 보통: '', 조심: 'mark-careful' } as const;

export function ScoreLine({ label, value, average = false }: { label: string; value: number; average?: boolean }) {
  const grade = average ? gradeOfAverage(value) : gradeOf(value);
  return (
    <div className="score-line">
      <span className="label">{label}</span>
      <span className={`value ${markClass[grade]}`} aria-label={`${value}점 ${grade}`}>
        {value}점
      </span>
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
        return <ScoreLine key={s.id} label={label} value={s.scores[field]} />;
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
