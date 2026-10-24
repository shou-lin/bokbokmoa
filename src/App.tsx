import { useMemo, useState } from 'react';
import { todayKST, type YMD, WEEKDAYS, weekdayOf } from './fortune/date';
import { sajuOf } from './fortune/personal';
import type { Field } from './fortune/score';
import { Calendar, type Mode } from './screens/Calendar';
import { DayDetail } from './screens/DayDetail';
import { Finder } from './screens/Finder';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { type Schedule, useOnboarded, useProfile, useSchedules } from './storage';
import { Disclaimer, Sheet, useMedia } from './ui';

type Tab = 'home' | 'calendar' | 'finder' | 'settings';
const TABS: [Tab, string][] = [['home', '홈'], ['calendar', '달력'], ['finder', '좋은 날'], ['settings', '설정']];

export function App() {
  const today = useMemo(todayKST, []);
  const [profile, setProfile] = useProfile();
  const [schedules, setSchedules] = useSchedules();
  const [onboarded, setOnboarded] = useOnboarded();
  const [tab, setTab] = useState<Tab>('home');
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

  const addSchedule = (s: Omit<Schedule, 'id' | 'createdAt'>) =>
    setSchedules((list) => [...list, { ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() }].sort((a, b) => a.date.localeCompare(b.date)));

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
