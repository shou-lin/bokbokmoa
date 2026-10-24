import { type Profile, type Saju, ZODIAC } from '../fortune/personal';
import type { Schedule } from '../storage';
import { Sheet } from '../ui';

export function Settings(props: { profile: Profile | null; me?: Saju; schedules: Schedule[]; onEdit: () => void; onDeleteProfile: () => void; onDeleteSchedule: (id: string) => void; onDeleteAll: () => void }) {
  const { profile, me, schedules } = props;
  return (
    <Sheet>
      <h1 className="h-display">설정</h1>
      <p className="ui-caption">내 정보</p>
      <div className="group">
        <button className="row" type="button" onClick={props.onEdit}>
          <span className="grow">생년월일시</span>
          <span className="value">{profile ? `${profile.calendar === 'lunar' ? '음력 ' : ''}${profile.birthDate} ${profile.birthTime ?? '시간 모름'}` : '입력하기'}</span>
        </button>
        {me && (
          <div className="row">
            <span className="grow">띠 · 사주</span>
            <span className="value">
              {ZODIAC[me.yearBranch]}띠 · {me.pillars.join(' ')}
            </span>
          </div>
        )}
        {profile && (
          <button className="row danger" type="button" onClick={props.onDeleteProfile}>
            내 정보 삭제 (일반 모드로)
          </button>
        )}
      </div>
      <p className="ui-caption">일정 {schedules.length}개</p>
      <div className="group">
        {schedules.map((s) => (
          <div className="row" key={s.id}>
            <span className="grow">
              {s.date} {s.title}
            </span>
            <button type="button" className="danger" style={{ border: 0, background: 'none', color: 'var(--color-ios-red)' }} onClick={() => props.onDeleteSchedule(s.id)}>
              삭제
            </button>
          </div>
        ))}
        <button className="row danger" type="button" disabled={!schedules.length} onClick={props.onDeleteAll}>
          일정 전체 삭제
        </button>
      </div>
      <p className="ui-caption">로그인 없이 이 기기 브라우저에만 저장돼요. 브라우저 데이터를 지우면 일정과 내 정보도 함께 사라져요.</p>
      <p className="h-note">점수는 운의 흐름을 재미로 보여줄 뿐, 어떤 결과도 보장하지 않아요.</p>
    </Sheet>
  );
}
