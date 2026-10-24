import { useState } from 'react';
import { fmt, type YMD, WEEKDAYS } from '../fortune/date';
import type { Saju } from '../fortune/personal';
import { type Field, scoreDay } from '../fortune/score';
import type { Kind, Schedule } from '../storage';
import { josa, SourceLines, Sticky, signalText, shortName, sourceLabel } from '../ui';

const fieldKind: Record<Field, Kind> = { 종합: '기타', 이동: '이사', 계약: '계약', 재물: '개업/투자' };

export function DayDetail({ date, me, field, schedules, onAdd }: { date: YMD; me?: Saju; field: Field; schedules: Schedule[]; onAdd: (s: Omit<Schedule, 'id' | 'createdAt'>) => void }) {
  const day = scoreDay(date, me);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const rules = day.sources.flatMap((s) => s.rules).filter((r) => Object.keys(r.signals).length > 0);
  const onDay = schedules.filter((s) => s.date === fmt(date));

  return (
    <div>
      <h2 className="h-display">
        {date.month}월 {date.day}일 ({WEEKDAYS[day.info.weekday]})
      </h2>
      <p className="h-note">
        음력 {day.info.lunar.isLeapMonth ? '윤' : ''}
        {day.info.lunar.month}월 {day.info.lunar.day}일 · 일진 {day.info.dayStem}
        {day.info.dayBranch} · {field} 평균 {day.average[field]}점
      </p>
      <SourceLines day={day} field={field} />
      {day.alerts.map((a) => (
        <p key={a.name} className="caution-note">
          ⚠️ {a.name} · {a.why.split(' · ').pop()}
        </p>
      ))}
      {day.conflicts.length > 0 && (
        <div className="stickies">
          <Sticky tone="blue" title="규칙이 엇갈리는 날" detail={explainConflict(day.sources.flatMap((s) => s.rules), day.conflicts[0])} />
        </div>
      )}
      <div className="stickies">
        {rules.map((r) => (
          <Sticky key={r.source + r.name} tone={r.source === 'me' ? 'pink' : 'yellow'} title={`${sourceLabel(r.source)} · ${shortName(r.name)}`} detail={`${signalText(r)} · ${r.why}`} />
        ))}
      </div>
      {onDay.map((s) => (
        <p key={s.id} className="h-body">
          ★ {s.title}
        </p>
      ))}
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onAdd({ title: title.trim(), date: fmt(date), kind: fieldKind[field] });
            setTitle('');
            setAdding(false);
          }}
        >
          <div className="group">
            <label className="row">
              <span className="grow">일정 이름</span>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 새집 이사" style={{ font: 'inherit', border: 0, textAlign: 'right', minWidth: 0 }} />
            </label>
          </div>
          <button className="btn primary" type="submit" disabled={!title.trim()}>
            저장
          </button>
        </form>
      ) : (
        <button className="btn primary" type="button" onClick={() => setAdding(true)}>
          이 날로 일정 추가
        </button>
      )}
    </div>
  );
}

function explainConflict(rules: { name: string; source: string; signals: Partial<Record<Field, number>> }[], f: Field) {
  const label = (r: { name: string; source: string }) => `${sourceLabel(r.source)}${josa(sourceLabel(r.source), '은', '는')} ${shortName(r.name)}`;
  const plus = rules.find((r) => (r.signals[f] ?? 0) > 0);
  const minus = rules.find((r) => (r.signals[f] ?? 0) < 0);
  return plus && minus ? `${f}: ${label(minus)}, ${label(plus)}` : `${f}에 + 와 − 가 함께 있어요`;
}
