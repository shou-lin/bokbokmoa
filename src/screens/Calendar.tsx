import type { KeyboardEvent } from 'react';
import { addDays, fmt, type YMD } from '../fortune/date';
import type { Saju } from '../fortune/personal';
import { FIELDS } from '../fortune/rules';
import { type Field, gradeOfAverage, scoreDay, SOURCES } from '../fortune/score';
import type { Schedule } from '../storage';
import { leadRule, Segmented, shortName } from '../ui';

export type Mode = '일반' | '나';

const gradeClass = { 좋음: 'good', 보통: '', 조심: 'careful' } as const;

export function Calendar(props: {
  month: { year: number; month: number };
  onMonth: (m: { year: number; month: number }) => void;
  today: YMD;
  selected: YMD;
  onSelect: (d: YMD) => void;
  field: Field;
  onField: (f: Field) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  me?: Saju;
  schedules: Schedule[];
  highlight?: (date: string) => boolean;
}) {
  const { month, today, selected, field, mode, me } = props;
  const first: YMD = { ...month, day: 1 };
  const lead = new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const scheduled = new Set(props.schedules.map((s) => s.date));
  const who = mode === '나' ? me : undefined;
  const results = Array.from({ length: days }, (_, i) => scoreDay(addDays(first, i), who));
  const count = (g: string) => results.filter((r) => gradeOfAverage(r.average[field]) === g).length;

  const shift = (n: number) => {
    const d = new Date(Date.UTC(month.year, month.month - 1 + n, 1));
    props.onMonth({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  };
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(selected, step);
    if (next.month !== month.month) props.onMonth({ year: next.year, month: next.month });
    props.onSelect(next);
  };

  return (
    <div>
      <div className="cal-head">
        <h2 className="h-display">
          {month.year}년 {month.month}월
        </h2>
        <div>
          <button type="button" aria-label="이전 달" onClick={() => shift(-1)}>‹</button>
          <button type="button" aria-label="다음 달" onClick={() => shift(1)}>›</button>
        </div>
      </div>
      {me && <Segmented label="점수 기준" options={['일반', '나'] as const} value={mode} onChange={props.onMode} />}
      <Segmented label="분야" options={FIELDS} value={field} onChange={props.onField} />
      <div className="cal-grid" role="grid" aria-label={`${month.month}월 운세 달력`} onKeyDown={onKey}>
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <div key={w} className="cal-wd">{w}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {results.map((r) => {
          const key = fmt(r.info.date);
          const v = r.average[field];
          const g = gradeOfAverage(v);
          const lr = leadRule(r.sources.filter((s) => s.id !== 'me').flatMap((s) => s.rules));
          const isSel = key === fmt(selected);
          const cls = ['cal-cell', gradeClass[g], key === fmt(today) ? 'today' : '', isSel ? 'selected' : '', props.highlight?.(key) ? 'selected' : ''].join(' ');
          const summary = `${r.info.date.month}/${r.info.date.day} 평균 ${v}점 (${g})` + r.sources.map((s) => ` · ${SOURCES[s.id].label} ${s.scores[field]}`).join('');
          return (
            <button key={key} type="button" className={cls} title={summary} aria-label={summary} tabIndex={isSel ? 0 : -1} onClick={() => props.onSelect(r.info.date)}>
              <span className="d">{r.info.date.day}</span>
              <span className="s">{v}</span>
              <span className="r">{lr ? shortName(lr.name) : ''}</span>
              {scheduled.has(key) && <span className="star" aria-label="일정 있음">★</span>}
            </button>
          );
        })}
      </div>
      <p className="h-body">
        좋은 날 {count('좋음')}일 · 조심할 날 {count('조심')}일
      </p>
      <p className="h-note">형광펜 좋음 · 빨간 원 조심 · 밑줄 오늘</p>
    </div>
  );
}
