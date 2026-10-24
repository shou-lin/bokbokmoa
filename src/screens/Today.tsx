import { addDays, fmt, type YMD, WEEKDAYS } from '../fortune/date';
import type { Saju } from '../fortune/personal';
import { average, gradeOfAverage, scoreDay, scoreRange } from '../fortune/score';
import type { Schedule } from '../storage';
import { Sheet, SourceLines, Sticky, signalText, shortName, sourceLabel, summaryOf } from '../ui';

const kindField = { 이사: '이동', 계약: '계약', '개업/투자': '재물', 기타: '종합' } as const;

export function Today({ today, me, schedules, onOpenSettings }: { today: YMD; me?: Saju; schedules: Schedule[]; onOpenSettings: () => void }) {
  const day = scoreDay(today, me);
  const general = me ? scoreDay(today) : day;
  const avg = day.average.종합;
  // 이번 주: 오늘이 속한 주의 월요일부터 일요일까지
  const monday = addDays(today, -((day.info.weekday + 6) % 7));
  const week = scoreRange(monday, 7, me);
  const weekAvg = average(week.map((d) => d.average)).종합;
  const bestDay = week.filter((d) => fmt(d.info.date) >= fmt(today)).sort((a, b) => b.average.종합 - a.average.종합)[0];
  const upcoming = schedules.filter((s) => s.date >= fmt(today)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
  const meRules = day.sources.find((s) => s.id === 'me')?.rules.filter((r) => Object.keys(r.signals).length) ?? [];
  const lead = day.sources.flatMap((s) => s.rules).filter((r) => r.source !== 'me' && Object.values(r.signals).some((v) => Math.abs(v) >= 2))[0];

  return (
    <Sheet>
      <p className="h-note">
        {today.month}월 {today.day}일 {WEEKDAYS[day.info.weekday]}요일 · 음력 {day.info.lunar.isLeapMonth ? '윤' : ''}
        {day.info.lunar.month}월 {day.info.lunar.day}일
      </p>
      <h1 className="today-score" style={{ margin: 0 }} aria-label={`오늘 평균 ${avg}점, ${gradeOfAverage(avg)}`}>
        <span className="ts-label">오늘의 운세 · {me ? '나에게' : `${day.sources.length}개 나라`} 평균</span>
        <span className="ts-num">
          {avg}
          <small>점</small>
        </span>
        <span className="ts-side">
          <span className={`ts-grade ${gradeOfAverage(avg)}`}>{gradeOfAverage(avg)}</span>
          {me && <span className="ts-sub">모두에게는 {general.average.종합}점</span>}
        </span>
      </h1>
      <p className="h-body">{day.conflicts.length && gradeOfAverage(avg) === '보통' ? '나라마다 엇갈리는 날' : summaryOf(day)}</p>
      <SourceLines day={day} field="종합" />
      {day.alerts.map((a) => (
        <p key={a.name} className="caution-note">
          ⚠️ {a.name} · {a.why.split(' · ').pop()}
        </p>
      ))}
      <p className="h-body">
        이번 주 평균 {weekAvg}점{bestDay && ` · ${fmt(bestDay.info.date) === fmt(today) ? '오늘' : `${WEEKDAYS[bestDay.info.weekday]}요일`}이 최고`}
      </p>
      {upcoming.length > 0 && (
        <>
          <p className="h-body title-ink">다가오는 일정</p>
          {upcoming.map((s) => {
            const d = scoreDay({ year: +s.date.slice(0, 4), month: +s.date.slice(5, 7), day: +s.date.slice(8, 10) }, me);
            const dday = Math.round((Date.parse(s.date) - Date.parse(fmt(today))) / 86400000);
            const f = kindField[s.kind];
            return (
              <div key={s.id}>
                <p className="h-body">
                  ★ {s.date.slice(5).replace('-', '/')} {s.title} · {dday === 0 ? 'D-day' : `D-${dday}`}
                </p>
                <p className="h-note">
                  그날 {f} 평균 {d.average[f]}점
                </p>
              </div>
            );
          })}
        </>
      )}
      {!me && (
        <p className="h-note">
          <button type="button" className="h-note" style={{ border: 0, background: 'none', padding: 0, textDecoration: 'underline' }} onClick={onOpenSettings}>
            생년월일시를 넣으면 나에게 맞춘 점수를 볼 수 있어요
          </button>
        </p>
      )}
      <div className="stickies">
        {lead && <Sticky title={`${sourceLabel(lead.source)} · ${shortName(lead.name)}`} detail={signalText(lead)} />}
        {meRules[0] && <Sticky tone="pink" title={shortName(meRules[0].name)} detail={signalText(meRules[0])} />}
        {day.conflicts.length > 0 && <Sticky tone="blue" title="규칙이 엇갈리는 날" detail={`${day.conflicts.join('·')}에 + 와 − 가 함께 있어요`} />}
      </div>
    </Sheet>
  );
}
