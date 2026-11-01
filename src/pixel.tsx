// 폴더폰 문자함 디자인의 픽셀 부품: 도트 아이콘, 위쪽 상태바, 문자 도착음
import { type ReactNode, useEffect, useState } from 'react';

// 글자 하나가 도트 하나. '.'은 비워 둔다
const COLORS: Record<string, string> = { n: 'var(--px-navy, #1c2397)', w: '#fff', s: '#9fd8ff', b: '#3f63e0', r: '#e8455a', y: '#ffd84a', l: '#c7caf4', g: '#5fc46a' };

const ICONS = {
  envelope: ['nnnnnnnnnnnn', 'nwnwwwwwwnwn', 'nwwnwwwwnwwn', 'nwwwnwwnwwwn', 'nwwwwnnwwwwn', 'nwwwwwwwwwwn', 'nwwwwwwwwwwn', 'nnnnnnnnnnnn'],
  house: ['.....n.....', '....nnn....', '...nwwwn...', '..nwwwwwn..', '.nwwwwwwwn.', 'nnnnnnnnnnn', '.nwwnnnwwn.', '.nwwnsnwwn.', '.nwwnsnwwn.', '.nnnnnnnnn.'],
  calendar: ['.n....n...', 'nnnnnnnnnn', 'nssssssssn', 'nnnnnnnnnn', 'nwwwwwwwwn', 'nwnwnwnwwn', 'nwwwwwwwwn', 'nwnwnwnwwn', 'nwwwwwwwwn', 'nnnnnnnnnn'],
  star: ['....n....', '....n....', '...nyn...', 'nnnnynnnn', '.nyyyyyn.', '..nyyyn..', '.nyynyyn.', '.nyn.nyn.', 'nn.....nn'],
  gear: ['...n.n...', '.nnnnnnn.', '.nwwwwwn.', 'nnwnnnwnn', '.nwn.nwn.', 'nnwnnnwnn', '.nwwwwwn.', '.nnnnnnn.', '...n.n...'],
  kr: ['..nnnnn..', '.nrrrrrn.', 'nrrrrrrrn', 'nrrrrsssn', 'nrrbbbbbn', 'nbbbbbbbn', '.nbbbbbn.', '..nnnnn..'],
  jp: ['nnnnnnnnnnn', 'nwwwwwwwwwn', 'nwwwwrwwwwn', 'nwwwrrrwwwn', 'nwwwrrrwwwn', 'nwwwwrwwwwn', 'nwwwwwwwwwn', 'nnnnnnnnnnn'],
  th: ['nnnnnnnnnnn', 'nrrrrrrrrrn', 'nwwwwwwwwwn', 'nbbbbbbbbbn', 'nbbbbbbbbbn', 'nwwwwwwwwwn', 'nrrrrrrrrrn', 'nnnnnnnnnnn'],
  maya: ['.....n.....', '....nyn....', '...nnnnn...', '...nyyyn...', '..nnnnnnn..', '..nyyyyyn..', '.nnnnnnnnn.', 'nnnnnnnnnnn'],
  me: ['...nnn...', '..nwwwn..', '..nwwwn..', '...nnn...', '..nnnnn..', '.nwwwwwn.', 'nwwwwwwwn', 'nnnnnnnnn'],
  warn: ['....n....', '...nyn...', '..nynyn..', '..nynyn..', '.nyynyyn.', '.nyyyyyn.', 'nyyynyyyn', 'nnnnnnnnn'],
  globe: ['....nnnn....', '..nnbbbbnn..', '.nbbggbbbbn.', '.nbgggbbbbn.', 'nbbgggbbgbbn', 'nbbbgbbgggbn', 'nbbbbbbgggbn', 'nbggbbbbgbbn', '.nbgggbbbbn.', '.nbbgbbbbbn.', '..nnbbbbnn..', '....nnnn....'],
} as const;

export type IconName = keyof typeof ICONS;

export function PixelIcon({ name, size = 2, className }: { name: IconName; size?: number; className?: string }) {
  const rows = ICONS[name];
  const w = rows[0].length;
  return (
    <svg className={className} width={w * size} height={rows.length * size} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS[c]} />)))}
    </svg>
  );
}

/** 한국 시각 HH:MM. 30초마다 다시 읽는다 */
export function useClock() {
  const read = () => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNow(read()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** 폴더폰 위쪽 상태바: 안테나, 이름, 시계, 배터리 */
export function StatusBar({ className = '' }: { className?: string }) {
  const now = useClock();
  return (
    <div className={`statusbar ${className}`}>
      <span className="sb-signal" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sb-title">복복모아</span>
      <span className="sb-right">
        <span>{now}</span>
        <span className="sb-battery" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </span>
    </div>
  );
}

/** 폴더폰 한 대: 인트로와 온보딩이 같은 크기(아이폰 17 Pro 402×874)의 틀을 쓴다 */
export function PhoneShell({ title, icon = 'envelope', right, sky, keys, label, onPointerDown, children }: { title: string; icon?: IconName; right?: ReactNode; sky?: ReactNode; keys?: ReactNode; label?: string; onPointerDown?: () => void; children: ReactNode }) {
  return (
    <div className="intro" onPointerDown={onPointerDown}>
      <section className="intro-phone" aria-label={label ?? title}>
        <StatusBar className="intro-status" />
        {sky ?? (
          <div className="intro-sky small" aria-hidden="true">
            <PixelIcon name="globe" size={4} className="intro-globe" />
            <PixelIcon name="envelope" size={5} className="intro-envelope-still" />
          </div>
        )}
        <div className="intro-bar">
          <PixelIcon name={icon} size={2} />
          <span>{title}</span>
          {right && <span className="intro-count">{right}</span>}
        </div>
        <div className="intro-body">{children}</div>
        {keys && <div className="intro-keys">{keys}</div>}
      </section>
    </div>
  );
}

let audio: AudioContext | undefined;

/** 문자 도착음 "띠링". 브라우저가 소리를 막으면 false를 돌려주고, 사용자가 화면을 누른 뒤 다시 부르면 울린다 */
export async function ding(): Promise<boolean> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return false;
  audio ??= new Ctx();
  if (audio.state !== 'running') await Promise.race([audio.resume().catch(() => {}), new Promise((r) => setTimeout(r, 150))]);
  if (audio.state !== 'running') return false;
  const t = audio.currentTime;
  for (const [freq, at] of [
    [1568, 0],
    [2093, 0.13],
  ]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + at);
    gain.gain.exponentialRampToValueAtTime(0.18, t + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.32);
    osc.connect(gain).connect(audio.destination);
    osc.start(t + at);
    osc.stop(t + at + 0.34);
  }
  navigator.vibrate?.([70, 50, 70]);
  return true;
}
