import { useEffect, useMemo, useRef, useState } from 'react';
import { type YMD, WEEKDAYS } from '../fortune/date';
import type { Saju } from '../fortune/personal';
import { gradeOfAverage, scoreDay } from '../fortune/score';
import { ding, PhoneShell, PixelIcon, useClock } from '../pixel';
import { shortName, sourceLabel, summaryOf } from '../ui';

type Phase = 'arrive' | 'open' | 'read';

/** 오늘 운세를 문자 한 통으로 만든다 */
function messageOf(today: YMD, me?: Saju) {
  const day = scoreDay(today, me);
  const a = day.average;
  const rules = day.sources.flatMap((s) => s.rules).filter((r) => r.source !== 'me');
  const weight = (r: (typeof rules)[number]) => Object.values(r.signals).reduce((x, v) => x + v, 0);
  const good = [...rules].sort((x, y) => weight(y) - weight(x)).find((r) => weight(r) > 0);
  const bad = [...rules].sort((x, y) => weight(x) - weight(y)).find((r) => weight(r) < 0);
  return [
    `${today.month}월 ${today.day}일 ${WEEKDAYS[day.info.weekday]}요일 오늘의 운세`,
    `${me ? '나에게' : '모두에게'} ${a.종합}점 · ${gradeOfAverage(a.종합)}`,
    me ? `(모두에게는 ${scoreDay(today).average.종합}점)` : '',
    `"${summaryOf(day)}"`,
    `이동 ${a.이동} · 계약 ${a.계약} · 재물 ${a.재물}`,
    good ? `좋은 기운: ${sourceLabel(good.source)} ${shortName(good.name)}` : '',
    bad ? `조심: ${sourceLabel(bad.source)} ${shortName(bad.name)}` : '',
    ...day.alerts.map((r) => `! ${shortName(r.name)}`),
  ]
    .filter(Boolean)
    .join('\n');
}

export function Intro({ today, me, onDetail, onSkip }: { today: YMD; me?: Saju; onDetail: () => void; onSkip: () => void }) {
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const text = useMemo(() => messageOf(today, me), [today, me]);
  const received = useClock();
  const [phase, setPhase] = useState<Phase>(reduced ? 'read' : 'arrive');
  const [typed, setTyped] = useState(reduced ? text.length : 0);
  const rang = useRef(false);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const done = typed >= text.length;

  const ring = () => {
    if (rang.current) return;
    ding().then((ok) => {
      if (ok) rang.current = true;
    });
  };

  // 도착(띠링·진동) → 봉투 열림 → 타이핑
  useEffect(() => {
    const ids = [setTimeout(ring, 250)];
    if (!reduced) ids.push(setTimeout(() => setPhase('open'), 1700), setTimeout(() => setPhase('read'), 2600));
    return () => ids.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== 'read' || done) return;
    const id = setInterval(() => setTyped((n) => Math.min(text.length, n + 1)), 38);
    return () => clearInterval(id);
  }, [phase, done, text]);

  useEffect(() => {
    if (done && phase === 'read') firstChoice.current?.focus();
  }, [done, phase]);

  // 화면을 누르면 소리를 다시 시도하고(브라우저가 막았던 경우), 지금 단계를 건너뛴다
  const hurry = () => {
    ring();
    if (phase !== 'read') setPhase('read');
    else setTyped(text.length);
  };

  return (
    <PhoneShell
      title="메시지"
      label="복복모아에서 온 문자"
      right={phase === 'read' ? '읽음' : '새 메시지 1'}
      onPointerDown={ring}
      sky={
        <div className={`intro-sky ${phase}`}>
          <PixelIcon name="globe" size={5} className="intro-globe" />
          <div className="envelope" aria-hidden="true">
            <div className="letter" />
            <div className="flap" />
          </div>
          {phase === 'arrive' && <span className="intro-new">NEW</span>}
        </div>
      }
      keys={
        <>
          {/* 다 읽은 뒤에는 아래 두 선택지가 같은 일을 하므로 건너뛰기 키를 감춘다 */}
          <button type="button" onClick={onSkip} disabled={done && phase === 'read'} aria-hidden={done && phase === 'read'}>
            {done && phase === 'read' ? '' : '건너뛰기'}
          </button>
          <span aria-hidden="true">
            <PixelIcon name="house" size={2} />
          </span>
          <button type="button" onClick={hurry} disabled={phase === 'read' && done}>
            {phase === 'read' ? '전체 보기' : '열기'}
          </button>
        </>
      }
    >
      {phase !== 'read' ? (
        <button type="button" className="intro-row" onClick={hurry}>
          <PixelIcon name="envelope" size={2} />
          <span className="grow">복복모아 · 오늘의 운세가 도착했어요</span>
          <span className="intro-time">{received}</span>
        </button>
      ) : (
        <article className="intro-msg">
          <div className="intro-msg-head">
            <span>보낸 사람 복복모아</span>
            <span>{received} 받음</span>
          </div>
          <p className="sr-only">{text}</p>
          {/* 눌러서 타이핑을 끝내는 건 마우스 지름길이고, 키보드는 아래 '전체 보기' 키를 쓴다 */}
          <p className="intro-text" aria-hidden="true" onClick={done ? undefined : hurry}>
            {text.slice(0, typed)}
            <span className={`caret ${done ? 'idle' : ''}`}>▌</span>
          </p>
        </article>
      )}

      {phase === 'read' && done && (
        <div className="intro-choices">
          {me ? (
            <button ref={firstChoice} type="button" className="intro-choice" onClick={onSkip}>
              <PixelIcon name="calendar" size={2} />
              <span className="grow">내 운세 달력 열기</span>
              <span aria-hidden="true">▷</span>
            </button>
          ) : (
            <>
              <button ref={firstChoice} type="button" className="intro-choice" onClick={onDetail}>
                <PixelIcon name="me" size={2} />
                <span className="grow">
                  생년월일 넣고 자세히 보기
                  <small>사주로 나에게 맞춘 점수를 더해요</small>
                </span>
                <span aria-hidden="true">▷</span>
              </button>
              <button type="button" className="intro-choice" onClick={onSkip}>
                <PixelIcon name="calendar" size={2} />
                <span className="grow">
                  건너뛰고 둘러보기
                  <small>누구에게나 같은 일반 길일 달력</small>
                </span>
                <span aria-hidden="true">▷</span>
              </button>
            </>
          )}
        </div>
      )}
    </PhoneShell>
  );
}
