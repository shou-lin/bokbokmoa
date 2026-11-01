import { useEffect, useState } from 'react';
import { type Profile, type Saju, ZODIAC } from '../fortune/personal';
import type { Schedule } from '../storage';
import { josa, Sheet } from '../ui';

type Undo = { label: string; restore: () => void };

export function Settings(props: {
  profile: Profile | null;
  me?: Saju;
  schedules: Schedule[];
  onEdit: () => void;
  onDeleteProfile: () => void;
  onRestoreProfile: (p: Profile) => void;
  onDeleteSchedule: (id: string) => void;
  onRestoreSchedules: (list: Schedule[]) => void;
  onExportSchedule: (s: Schedule) => void;
  onDeleteAll: () => void;
}) {
  const { profile, me, schedules } = props;
  // 지우면 바로 지우고, 몇 초 동안 "되돌리기"를 보여준다 (확인 창 대신)
  const [undo, setUndo] = useState<Undo | null>(null);
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(id);
  }, [undo]);
  const remove = (label: string, action: () => void, restore: () => void) => {
    action();
    setUndo({ label, restore });
  };
  const undoRow = (
    <div role="status">
      {undo && (
        <div className="undo-row">
          <span className="grow">{undo.label}</span>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              undo.restore();
              setUndo(null);
            }}
          >
            되돌리기
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="columns cols-settings">
      <Sheet className="p-profile">
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
            <button className="row danger" type="button" onClick={() => remove('내 정보를 지웠어요', props.onDeleteProfile, () => props.onRestoreProfile(profile))}>
              내 정보 삭제 (일반 모드로)
            </button>
          )}
        </div>
      </Sheet>
      <Sheet className="p-schedules">
        <h2 className="h-display">일정 {schedules.length}개</h2>
        {undoRow}
        {schedules.length === 0 && <p className="h-note">좋은 날 찾기나 달력에서 고른 날을 일정으로 저장하면 여기에 모여요</p>}
        {schedules.length > 0 && (
          <div className="group">
            {schedules.map((s) => (
              <div className="row" key={s.id}>
                <span className="grow ellipsis" title={`${s.date} ${s.title}`}>
                  {s.date.slice(5).replace('-', '/')} {s.title}
                </span>
                <button type="button" className="mini-btn" onClick={() => props.onExportSchedule(s)}>
                  캘린더
                </button>
                <button type="button" className="mini-btn danger" aria-label={`${s.title} 삭제`} onClick={() => remove(`'${s.title}'${josa(s.title, '을', '를')} 지웠어요`, () => props.onDeleteSchedule(s.id), () => props.onRestoreSchedules(schedules))}>
                  삭제
                </button>
              </div>
            ))}
            <button className="row danger" type="button" onClick={() => remove(`일정 ${schedules.length}개를 모두 지웠어요`, props.onDeleteAll, () => props.onRestoreSchedules(schedules))}>
              일정 전체 삭제
            </button>
          </div>
        )}
      </Sheet>
      <Sheet className="p-about">
        <h2 className="h-display">저장과 안내</h2>
        <p className="ui-caption">로그인 없이 이 기기 브라우저에만 저장돼요. 브라우저 데이터를 지우면 일정과 내 정보도 함께 사라져요.</p>
        <p className="h-note">점수는 운의 흐름을 재미로 보여줄 뿐, 어떤 결과도 보장하지 않아요.</p>
      </Sheet>
    </div>
  );
}
