import { useEffect, useMemo, useState } from 'react';
import { CREATOR_EMAIL, loadProfile, saveProfile, useSession } from './account';
import { type Profile, sajuOf } from './fortune/personal';
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
  const session = useSession();
  const userId = session?.user.id;
  const email = session?.user.email;
  const isCreator = email?.toLowerCase() === CREATOR_EMAIL;
  // 제작자도 평소에는 일반 화면을 쓰고, 스위치를 켤 때만 받은 피드백을 본다
  const [creatorOn, setCreatorOn] = useState(() => {
    try {
      return localStorage.getItem('bokbokmoa.creator') === '1';
    } catch {
      return false;
    }
  });
  const changeCreator = (on: boolean) => {
    setCreatorOn(on);
    try {
      localStorage.setItem('bokbokmoa.creator', on ? '1' : '0');
    } catch {}
  };
  // 로그인한 동안 내 정보를 바꾸면 계정에도 저장한다
  const changeProfile = (p: Profile | null) => {
    setProfile(p);
    if (userId) saveProfile(userId, p);
  };
  // 로그인하면 계정의 내 정보를 불러오고, 계정에 없으면 이 기기의 정보를 올린다
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadProfile().then((server) => {
      if (!alive) return;
      if (server) {
        setProfile(server);
        setMode('나');
        setOnboarded(true);
      } else if (profile) saveProfile(userId, profile);
    });
    return () => {
      alive = false;
    };
  }, [userId]);
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
            changeProfile(p);
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
        {/* 오늘의 운세 문자를 다시 받아 보기 */}
        <button type="button" onClick={() => setIntro(true)}>
          <PixelIcon name="envelope" size={2} className="nav-icon" />
          오늘
        </button>
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
              changeProfile(null);
              setMode('일반');
            }}
            onRestoreProfile={(p) => {
              changeProfile(p);
              setMode('나');
            }}
            onDeleteSchedule={(id) => setSchedules((l) => l.filter((s) => s.id !== id))}
            onRestoreSchedules={setSchedules}
            onExportSchedule={exportSchedule}
            onDeleteAll={() => setSchedules([])}
            account={{ email, isCreator, creatorOn, onCreator: changeCreator }}
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
