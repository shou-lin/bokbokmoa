import { useMemo, useState } from 'react';
import { sajuOf } from './fortune/personal';
import { type Field, gradeOfAverage, scoreDay } from './fortune/score';
import { buildIcs, openIcs } from './ics';
import { Calendar, type Mode } from './screens/Calendar';
import { DayDetail } from './screens/DayDetail';
import { Finder } from './screens/Finder';
import { Intro } from './screens/Intro';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { type Kind, type Schedule, useOnboarded, useProfile, useSchedules } from './storage';
import { fmt, parseYMD, todayKST, type YMD, WEEKDAYS, weekdayOf } from './fortune/date';
import { type IconName, PhoneShell, PixelIcon, StatusBar } from './pixel';
import { BottomSheet, Disclaimer, Sheet, shortName, signalText, sourceLabel, useMedia } from './ui';

type Tab = 'home' | 'calendar' | 'finder' | 'settings';
const KIND_FIELD: Record<Kind, Field> = { 이사: '이동', 계약: '계약', '개업/투자': '재물', 기타: '종합' };
const TABS: [Tab, string, IconName][] = [['home', '홈', 'house'], ['calendar', '달력', 'calendar'], ['finder', '좋은 날', 'star'], ['settings', '설정', 'gear']];

// 문자 인트로는 탭(창)을 새로 열 때마다 한 번. ?tab= 으로 바로 들어오면(비교 페이지 등) 건너뛴다
const INTRO_KEY = 'bokbokmoa.intro';
function introSeen() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

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
  const [intro, setIntro] = useState(() => !new URLSearchParams(location.search).has('tab') && !introSeen());
  const [selected, setSelected] = useState<YMD>(today);
  const [month, setMonth] = useState({ year: today.year, month: today.month });
  const [field, setField] = useState<Field>('종합');
  const [mode, setMode] = useState<Mode>('나');
  const [sheetOpen, setSheetOpen] = useState(false);
  // 아이패드 가로·컴퓨터에서는 날짜 상세를 옆 칸에, 그 밖에는 아래 시트로 연다
  const sideDetail = useMedia('(min-width: 768px) and (orientation: landscape), (min-width: 1400px)');
  const desktop = useMedia('(min-width: 1400px)');

  const me = useMemo(() => {
    try {
      return profile ? sajuOf(profile) : undefined;
    } catch {
      return undefined;
    }
  }, [profile]);
  const calMe = mode === '나' ? me : undefined;

  // 일정은 기기에 저장하고, 원하면 같은 내용을 .ics로 열어 iOS 캘린더에도 넣는다
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
    return created;
  };

  const closeIntro = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {}
    setIntro(false);
  };
  if (intro) {
    return (
      <Intro
        today={today}
        me={me}
        onDetail={() => {
          closeIntro();
          if (onboarded) setEditing(true);
        }}
        onSkip={() => {
          closeIntro();
          setOnboarded(true);
        }}
      />
    );
  }

  if (!onboarded || editing) {
    // 온보딩도 인트로와 같은 폰 한 대 안에서, 받은 문자에 답장하듯 보여준다
    return (
      <PhoneShell title={editing ? '내 정보 고치기' : '답장 · 생년월일'} icon="me">
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
      </PhoneShell>
    );
  }

  // 날짜 상세 칸이 화면에 있으면 거기에, 없으면 아래 시트로 연다
  const detailShown = (tab === 'calendar' && sideDetail) || (tab === 'home' && desktop);
  const select = (d: YMD, open = true) => {
    setSelected(d);
    if (open && !detailShown) setSheetOpen(true);
  };
  const calendar = (
    <Calendar month={month} onMonth={setMonth} today={today} selected={selected} onSelect={select} field={field} onField={setField} mode={me ? mode : '일반'} onMode={setMode} me={me} schedules={schedules} />
  );
  const detail = <DayDetail key={fmt(selected)} date={selected} me={calMe} field={field} schedules={schedules} onAdd={addSchedule} onExport={exportSchedule} />;

  return (
    <>
      <nav className="nav" aria-label="메뉴">
        <span className="logo">{desktop ? '복복모아' : '복복'}</span>
        {TABS.map(([id, label, icon]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <PixelIcon name={icon} size={2} className="nav-icon" />
            {label}
          </button>
        ))}
        <span className="today-label">
          {today.month}월 {today.day}일 {WEEKDAYS[weekdayOf(today)]}요일
        </span>
      </nav>
      <main className="app">
        <StatusBar />
        {/* 모든 탭이 같은 틀(칸 구성)을 쓴다. 칸 수는 화면 크기가 정한다: 1칸 · 2칸(아이패드 가로) · 3칸(컴퓨터) */}
        {tab === 'home' && (
          <div className="columns cols-home">
            <Today today={today} me={me} schedules={schedules} onOpenSettings={() => setEditing(true)} />
            <Sheet className="wide-only">{calendar}</Sheet>
            <Sheet className="desktop-only">{detail}</Sheet>
          </div>
        )}
        {tab === 'calendar' && (
          <div className="columns cols-calendar">
            <Sheet>{calendar}</Sheet>
            <Sheet className="wide-only">{detail}</Sheet>
          </div>
        )}
        {/* 다른 탭에 다녀와도 찾은 결과가 남도록 좋은 날 찾기는 숨기기만 한다 */}
        <Finder hidden={tab !== 'finder'} today={today} me={me} weekday={weekdayOf(today)} onSave={addSchedule} onExport={exportSchedule} />
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
            onRestoreProfile={(p) => {
              setProfile(p);
              setMode('나');
            }}
            onDeleteSchedule={(id) => setSchedules((l) => l.filter((s) => s.id !== id))}
            onRestoreSchedules={setSchedules}
            onExportSchedule={exportSchedule}
            onDeleteAll={() => setSchedules([])}
          />
        )}
        <Disclaimer />
      </main>
      {sheetOpen && (
        <BottomSheet label={`${selected.month}월 ${selected.day}일 상세`} onClose={() => setSheetOpen(false)}>
          {detail}
        </BottomSheet>
      )}
    </>
  );
}
