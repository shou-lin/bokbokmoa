import { useMemo, useState } from 'react';
import { parseYMD, todayKST, type YMD, WEEKDAYS, weekdayOf } from './fortune/date';
import { sajuOf } from './fortune/personal';
import { type Field, gradeOfAverage, scoreDay } from './fortune/score';
import { buildIcs, openIcs } from './ics';
import { Calendar, type Mode } from './screens/Calendar';
import { DayDetail } from './screens/DayDetail';
import { Finder } from './screens/Finder';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { type Kind, type Schedule, useOnboarded, useProfile, useSchedules } from './storage';
import { Disclaimer, Sheet, shortName, signalText, sourceLabel, useMedia } from './ui';

type Tab = 'home' | 'calendar' | 'finder' | 'settings';
const KIND_FIELD: Record<Kind, Field> = { 이사: '이동', 계약: '계약', '개업/투자': '재물', 기타: '종합' };
const TABS: [Tab, string][] = [['home', '홈'], ['calendar', '달력'], ['finder', '좋은 날'], ['settings', '설정']];

export function App() {
  const today = useMemo(todayKST, []);
  const [profile, setProfile] = useProfile();
  const [schedules, setSchedules] = useSchedules();
  const [onboarded, setOnboarded] = useOnboarded();
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(location.search).get('tab');
    return TABS.some(([id]) => id === t) ? (t as Tab) : 'home';
  });
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<YMD>(today);
  const [month, setMonth] = useState({ year: today.year, month: today.month });
  const [field, setField] = useState<Field>('종합');
  const [mode, setMode] = useState<Mode>('나');
  const [sheetOpen, setSheetOpen] = useState(false);
  // 아이패드 가로·컴퓨터에서는 날짜 상세를 옆 칸에, 그 밖에는 아래 시트로 연다
  const sideDetail = useMedia('(min-width: 768px) and (orientation: landscape)');
  const desktop = useMedia('(min-width: 1200px)');

  const me = useMemo(() => {
    try {
      return profile ? sajuOf(profile) : undefined;
    } catch {
      return undefined;
    }
  }, [profile]);
  const calMe = mode === '나' ? me : undefined;

  // 일정은 기기에 저장하고, 같은 내용을 .ics로 열어 iOS 캘린더에도 넣을 수 있게 한다
  const exportSchedule = (s: Schedule) => {
    const field = KIND_FIELD[s.kind];
    const day = scoreDay(parseYMD(s.date), me);
    const reasons = day.sources.flatMap((x) => x.rules).filter((r) => (r.signals[field] ?? 0) !== 0);
    const description = [
      `복복모아 · ${field} 평균 ${day.average[field]}점 (${gradeOfAverage(day.average[field])})`,
      ...reasons.map((r) => `${sourceLabel(r.source)} · ${shortName(r.name)} ${signalText(r)}`),
      ...day.alerts.map((a) => `⚠️ ${a.name}`),
      '점수는 운의 흐름을 재미로 보여주는 것이며, 어떤 결과도 보장하지 않습니다.',
    ].join('\n');
    openIcs(buildIcs(s, description), `bokbokmoa-${s.date}.ics`);
  };
  const addSchedule = (s: Omit<Schedule, 'id' | 'createdAt'>) => {
    const created: Schedule = { ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setSchedules((list) => [...list, created].sort((a, b) => a.date.localeCompare(b.date)));
    exportSchedule(created);
  };

  if (!onboarded || editing) {
    return (
      <main className="app">
        <Onboarding
          initial={editing ? profile : null}
          onDone={(p) => {
            setProfile(p);
            setMode('나');
            setOnboarded(true);
            setEditing(false);
          }}
          onSkip={() => {
            setOnboarded(true);
            setEditing(false);
          }}
        />
        <Disclaimer />
      </main>
    );
  }

  const select = (d: YMD) => {
    setSelected(d);
    if (!(sideDetail || (desktop && tab === 'home'))) setSheetOpen(true);
  };
  const calendar = (
    <Calendar month={month} onMonth={setMonth} today={today} selected={selected} onSelect={select} field={field} onField={setField} mode={me ? mode : '일반'} onMode={setMode} me={me} schedules={schedules} />
  );
  const detail = <DayDetail date={selected} me={calMe} field={field} schedules={schedules} onAdd={addSchedule} />;

  return (
    <>
      <nav className="nav" aria-label="메뉴">
        <span className="logo">{desktop ? '복복모아' : '복복'}</span>
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
        <span className="today-label">
          {today.month}월 {today.day}일 {WEEKDAYS[weekdayOf(today)]}요일
        </span>
      </nav>
      <main className="app">
        {tab === 'home' && (
          <div className="columns home">
            <Today today={today} me={me} schedules={schedules} onOpenSettings={() => setEditing(true)} />
            <div className="col-today-side">
              <Sheet>{calendar}</Sheet>
            </div>
            <div className="col-detail">
              <Sheet>{detail}</Sheet>
            </div>
          </div>
        )}
        {tab === 'calendar' && (
          <div className="columns calendar">
            <Sheet>{calendar}</Sheet>
            <div className="col-detail">
              <Sheet>{detail}</Sheet>
            </div>
          </div>
        )}
        {tab === 'finder' && <Finder today={today} me={me} weekday={weekdayOf(today)} onSave={addSchedule} />}
        {tab === 'settings' && (
          <Settings
            profile={profile}
            me={me}
            schedules={schedules}
            onEdit={() => setEditing(true)}
            onDeleteProfile={() => {
              setProfile(null);
              setMode('일반');
            }}
            onDeleteSchedule={(id) => setSchedules((l) => l.filter((s) => s.id !== id))}
            onExportSchedule={exportSchedule}
            onDeleteAll={() => setSchedules([])}
          />
        )}
        <Disclaimer />
      </main>
      {sheetOpen && (
        <div className="overlay" onClick={() => setSheetOpen(false)}>
          <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label="날짜 상세" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            {detail}
          </div>
        </div>
      )}
    </>
  );
}
