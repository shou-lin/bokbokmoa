import { useState } from 'react';
import { addDays, fmt, type YMD, WEEKDAYS } from '../fortune/date';
import type { Saju } from '../fortune/personal';
import { type DayResult, type Field, gradeOfAverage, scoreRange } from '../fortune/score';
import type { Kind, Schedule } from '../storage';
import { josa, leadRule, ScoreLine, Segmented, Sheet, shortName } from '../ui';

const KINDS = ['이사', '계약', '개업/투자', '기타'] as const;
const KIND_FIELDS: Record<Kind, Field[]> = { 이사: ['이동'], 계약: ['계약'], '개업/투자': ['재물', '계약'], 기타: ['종합'] };
const RANGES = ['이번 주', '이번 달', '3개월'] as const;
type Range = (typeof RANGES)[number];
// 수성 역행 표가 2027년까지라 기한도 그 안으로 제한한다
const LAST_DAY = '2027-12-31';

function rangeDays(today: YMD, range: Range, weekday: number) {
  if (range === '이번 주') return 7 - ((weekday + 6) % 7);
  if (range === '이번 달') return new Date(Date.UTC(today.year, today.month, 0)).getUTCDate() - today.day + 1;
  return 90;
}

const fieldScore = (d: DayResult, fields: Field[]) => Math.round(fields.reduce((a, f) => a + d.average[f], 0) / fields.length);
const label = (d: DayResult) => `${d.info.date.month}/${d.info.date.day} ${WEEKDAYS[d.info.weekday]}`;

export function Finder({ today, me, weekday, onSave }: { today: YMD; me?: Saju; weekday: number; onSave: (s: Omit<Schedule, 'id' | 'createdAt'>) => void }) {
  const [kind, setKind] = useState<Kind>('이사');
  const [range, setRange] = useState<Range>('이번 달');
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [shown, setShown] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const fields = KIND_FIELDS[kind];
  const n = rangeDays(today, range, weekday);
  const end = addDays(today, n - 1);
  const days = scoreRange(today, n, me).filter((d) => fmt(d.info.date) <= LAST_DAY && (!weekendOnly || d.info.weekday === 0 || d.info.weekday === 6));
  // 개인 모드에서는 띠와 충이 있는 날을 TOP 3에서 뺀다
  const clash = (d: DayResult) => d.sources.some((s) => s.id === 'me' && s.rules.some((r) => r.name.includes('띠') && r.name.includes('충')));
  const ranked = [...days].sort((a, b) => fieldScore(b, fields) - fieldScore(a, fields) || b.average.종합 - a.average.종합 || fmt(a.info.date).localeCompare(fmt(b.info.date)));
  const top = ranked.filter((d) => !clash(d)).slice(0, 3);
  const hasMinus2 = (d: DayResult) => d.sources.some((s) => s.rules.some((r) => fields.some((f) => (r.signals[f] ?? 0) <= -2)));
  // 피할 날: 기준 분야에 −2 신호가 있거나, 띠와 충이거나, 평균 등급이 조심인 날 (낮은 순)
  const avoidUnique = days
    .filter((d) => !top.includes(d) && (hasMinus2(d) || clash(d) || gradeOfAverage(fieldScore(d, fields)) === '조심'))
    .sort((a, b) => fieldScore(a, fields) - fieldScore(b, fields))
    .slice(0, 3);
  const reason = (d: DayResult, sign: 1 | -1) => leadRule(d.sources.flatMap((s) => s.rules).filter((r) => fields.some((f) => sign * (r.signals[f] ?? 0) > 0)));

  if (!shown) {
    return (
      <Sheet>
        <h2 className="h-display">어떤 일이 있나요?</h2>
        <Segmented label="일 종류" options={KINDS} value={kind} onChange={setKind} />
        <p className="h-note">{kind === '기타' ? '고백·여행·시험 등은 종합 점수로 골라요' : `${kind.replace('/', '·')}${josa(kind, '은', '는')} ${fields.join('·')} 점수로 골라요`}</p>
        <h2 className="h-display">언제까지 해야 하나요?</h2>
        <Segmented label="기한" options={RANGES} value={range} onChange={setRange} />
        <p className="h-note">
          {today.month}월 {today.day}일 ~ {end.month}월 {end.day}일 · {n}일 중에서 찾아요
        </p>
        <div className="group">
          <label className="row">
            <span className="grow">주말만 보기</span>
            <input className="toggle" type="checkbox" checked={weekendOnly} onChange={(e) => setWeekendOnly(e.target.checked)} />
          </label>
        </div>
        <button className="btn primary" type="button" onClick={() => setShown(true)}>
          좋은 날 찾기
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <h2 className="h-display">{kind === '기타' ? '좋은 날' : `${kind}하기 좋은 날`.replace('개업/투자하기', '개업·투자하기')}</h2>
      <p className="h-note">
        {today.month}월 {today.day}일 ~ {end.month}월 {end.day}일 · {fields.join('·')} 점수 기준{weekendOnly ? ' · 주말만' : ''}
      </p>
      {top.length === 0 && <p className="h-body">조건에 맞는 날이 없어요. 기한을 늘려 보세요.</p>}
      {top.map((d, i) => {
        const lr = reason(d, 1);
        const key = fmt(d.info.date);
        return (
          <button key={key} type="button" onClick={() => setPick(key)} style={{ display: 'block', width: '100%', border: 0, background: pick === key ? 'rgb(31 58 147 / 0.06)' : 'none', padding: 0, textAlign: 'left' }}>
            <ScoreLine average label={`${i + 1}. ${label(d)} ${lr ? shortName(lr.name) : ''}`} value={fieldScore(d, fields)} />
          </button>
        );
      })}
      <p className="h-body title-ink">피할 날{avoidUnique.length === 0 && <span className="h-note"> · 이 기간에는 특별히 피할 날이 없어요</span>}</p>
      {avoidUnique.map((d) => {
        const lr = reason(d, -1);
        return <ScoreLine key={fmt(d.info.date)} average label={`${label(d)} ${lr ? shortName(lr.name) : '점수가 낮은 날'}`} value={fieldScore(d, fields)} />;
      })}
      {pick ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onSave({ title: title.trim(), date: pick, kind });
            setPick(null);
            setTitle('');
          }}
        >
          <div className="group">
            <label className="row">
              <span className="grow">{pick.slice(5).replace('-', '/')} 일정 이름</span>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 새집 이사" style={{ font: 'inherit', border: 0, textAlign: 'right', minWidth: 0 }} />
            </label>
          </div>
          <button className="btn primary" type="submit" disabled={!title.trim()}>
            일정으로 저장
          </button>
        </form>
      ) : (
        <p className="h-note">TOP 3 중 하나를 누르면 일정으로 저장할 수 있어요</p>
      )}
      <button className="btn secondary" type="button" onClick={() => setShown(false)}>
        조건 다시 고르기
      </button>
      <p className="ui-caption">운의 흐름이 좋은 날일 뿐, 결정은 직접 내려요.</p>
    </Sheet>
  );
}
