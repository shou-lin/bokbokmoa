import { useState } from 'react';
import { addDays, fmt, type YMD, WEEKDAYS } from '../fortune/date';
import type { Saju } from '../fortune/personal';
import { type DayResult, type Field, gradeOfAverage, scoreRange } from '../fortune/score';
import type { Kind, Schedule } from '../storage';
import { PixelIcon } from '../pixel';
import { josa, leadRule, SavedNote, ScoreLine, Segmented, Sheet, shortName } from '../ui';

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

export function Finder({ hidden, today, me, weekday, onSave, onExport }: { hidden: boolean; today: YMD; me?: Saju; weekday: number; onSave: (s: Omit<Schedule, 'id' | 'createdAt'>) => Schedule; onExport: (s: Schedule) => void }) {
  const [kind, setKind] = useState<Kind>('이사');
  const [range, setRange] = useState<Range>('이번 달');
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [shown, setShown] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState<Schedule | null>(null);

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
  // 등급은 74점부터 좋음이라 TOP 3도 보통으로 보일 수 있다. 그래서 이 기간 평균과 비교해 보여준다
  const avg = days.length ? Math.round(days.reduce((a, d) => a + fieldScore(d, fields), 0) / days.length) : 0;
  const reason = (d: DayResult, sign: 1 | -1) => leadRule(d.sources.flatMap((s) => s.rules).filter((r) => fields.some((f) => sign * (r.signals[f] ?? 0) > 0)));

  // 조건 · TOP 3 · 피할 날을 세 장으로 나눈다. 한 칸 화면에서는 조건 → 결과 순서로 한 장씩, 넓은 화면에서는 나란히 보인다
  return (
    <div className="columns cols-finder" hidden={hidden} data-shown={shown || undefined}>
      <h1 className="sr-only">좋은 날 찾기</h1>
      <Sheet className="p-cond">
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
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            setShown(true);
            setPick(null);
            setSaved(null);
          }}
        >
          좋은 날 찾기
        </button>
      </Sheet>
      <Sheet className="p-top">
        {!shown && (
          <div className="empty-note">
            <PixelIcon name="star" size={4} />
            <p className="h-body">일 종류와 기한을 고르고 '좋은 날 찾기'를 누르면 여기에 TOP 3가 나와요</p>
          </div>
        )}
        {shown && (
          <>
            <h2 className="h-display">{kind === '기타' ? '좋은 날' : `${kind}하기 좋은 날`.replace('개업/투자하기', '개업·투자하기')}</h2>
            <p className="h-note">
              {today.month}월 {today.day}일 ~ {end.month}월 {end.day}일 · {fields.join('·')} 점수 기준{weekendOnly ? ' · 주말만' : ''}
            </p>
            {top.length === 0 && <p className="h-body">조건에 맞는 날이 없어요. 기한을 늘려 보세요.</p>}
            {top.length > 0 && <p className="h-note">이 기간 평균 {avg}점</p>}
            {top.map((d, i) => {
              const lr = reason(d, 1);
              const key = fmt(d.info.date);
              const diff = fieldScore(d, fields) - avg;
              return (
                <div key={key}>
                  <button type="button" className="pick-row" aria-expanded={pick === key} onClick={() => setPick(pick === key ? null : key)}>
                    <ScoreLine average grade="좋음" label={`${i + 1}. ${label(d)} ${lr ? shortName(lr.name) : ''}`} value={fieldScore(d, fields)} />
                    <span className="h-note">
                      {i === 0 ? '이 기간 최고 · ' : ''}
                      {diff > 0 ? `평균보다 +${diff}점` : '평균 수준'}
                    </span>
                  </button>
                  {pick === key && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!title.trim()) return;
                        setSaved(onSave({ title: title.trim(), date: key, kind }));
                        setPick(null);
                        setTitle('');
                      }}
                    >
                      <div className="group">
                        <label className="row">
                          <span className="grow">{key.slice(5).replace('-', '/')} 일정 이름</span>
                          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 새집 이사" style={{ font: 'inherit', border: 0, textAlign: 'right', minWidth: 0 }} />
                        </label>
                      </div>
                      <button className="btn primary" type="submit" disabled={!title.trim()}>
                        일정으로 저장
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
            {top.length > 0 && !pick && !saved && <p className="h-note">TOP 3 중 하나를 누르면 일정으로 저장할 수 있어요</p>}
            <SavedNote saved={saved} onExport={onExport} />
            <button className="btn secondary narrow-only" type="button" onClick={() => setShown(false)}>
              조건 다시 고르기
            </button>
          </>
        )}
      </Sheet>
      <Sheet className="p-avoid">
        <h2 className="h-display">피할 날</h2>
        {!shown && <p className="h-note">TOP 3를 찾으면 같은 기간에 피할 날도 함께 보여요</p>}
        {shown && avoidUnique.length === 0 && <p className="h-note">이 기간에는 특별히 피할 날이 없어요</p>}
        {shown && avoidUnique.map((d) => {
          const lr = reason(d, -1);
          return <ScoreLine key={fmt(d.info.date)} average grade="조심" label={`${label(d)} ${lr ? shortName(lr.name) : '점수가 낮은 날'}`} value={fieldScore(d, fields)} />;
        })}
        <p className="ui-caption">운의 흐름이 좋은 날일 뿐, 결정은 직접 내려요.</p>
      </Sheet>
    </div>
  );
}
