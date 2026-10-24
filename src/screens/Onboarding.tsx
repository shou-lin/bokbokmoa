import { useState } from 'react';
import { type Profile, sajuOf, ZODIAC } from '../fortune/personal';
import { Segmented, Sheet } from '../ui';

export function Onboarding({ initial, onDone, onSkip }: { initial: Profile | null; onDone: (p: Profile) => void; onSkip: () => void }) {
  const [calendar, setCalendar] = useState<'양력' | '음력'>(initial?.calendar === 'lunar' ? '음력' : '양력');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [isLeapMonth, setLeap] = useState(initial?.isLeapMonth ?? false);
  const [unknownTime, setUnknownTime] = useState(initial ? !initial.birthTime : false);
  const [birthTime, setBirthTime] = useState(initial?.birthTime ?? '');

  const year = +birthDate.slice(0, 4);
  // 생년은 1940~2020년을 지원한다 (PRD)
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && year >= 1940 && year <= 2020 && (unknownTime || /^\d{2}:\d{2}$/.test(birthTime));
  const profile: Profile = { birthDate, calendar: calendar === '음력' ? 'lunar' : 'solar', isLeapMonth: calendar === '음력' && isLeapMonth, birthTime: unknownTime ? undefined : birthTime };
  let preview = '';
  if (valid) {
    try {
      const s = sajuOf(profile);
      preview = `${s.solar.year}년생 ${ZODIAC[s.yearBranch]}띠 · 일주 ${s.pillars[2]}`;
    } catch {
      preview = '없는 날짜예요. 다시 확인해 주세요';
    }
  }

  return (
    <Sheet>
      <h1 className="h-display">{initial ? '내 정보 고치기' : '처음 오셨네요!'}</h1>
      <p className="h-body">생년월일시를 알려주면 나에게 맞춘 운세 달력을 만들어 드려요</p>
      <Segmented label="날짜 기준" options={['양력', '음력'] as const} value={calendar} onChange={setCalendar} />
      <div className="group">
        <label className="row">
          <span className="grow">생년월일</span>
          <input type="date" min="1940-01-01" max="2020-12-31" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        {calendar === '음력' && (
          <label className="row">
            <span className="grow">윤달</span>
            <input className="toggle" type="checkbox" checked={isLeapMonth} onChange={(e) => setLeap(e.target.checked)} />
          </label>
        )}
        <label className="row">
          <span className="grow">태어난 시간 모름</span>
          <input className="toggle" type="checkbox" checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} />
        </label>
        {!unknownTime && (
          <label className="row">
            <span className="grow">태어난 시간</span>
            <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
          </label>
        )}
      </div>
      <p className="h-body">{preview ? `→ ${preview}` : ' '}</p>
      <p className="ui-caption">생년월일시는 이 기기에만 저장되고 서버로 보내지 않아요. 성별은 받지 않아요.</p>
      <button className="btn primary" type="button" disabled={!valid || preview.startsWith('없는')} onClick={() => onDone(profile)}>
        {initial ? '저장하기' : '이대로 시작하기'}
      </button>
      <button className="btn secondary" type="button" onClick={onSkip}>
        {initial ? '취소' : '건너뛰고 일반 달력 보기'}
      </button>
    </Sheet>
  );
}
