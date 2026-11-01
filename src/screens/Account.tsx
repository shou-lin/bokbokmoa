import { type FormEvent, useEffect, useState } from 'react';
import { type Feedback, listFeedback, sendFeedback, signIn, signOut, signUp, supabase } from '../account';

/** 설정 > 계정: 로그인 전에는 이메일·비밀번호, 로그인 뒤에는 계정과 (제작자라면) 제작자 모드 스위치 */
export function AccountGroup({ email, isCreator, creatorOn, onCreator }: { email?: string; isCreator: boolean; creatorOn: boolean; onCreator: (on: boolean) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!supabase) return null;

  if (email) {
    return (
      <>
        <p className="ui-caption">계정</p>
        <div className="group">
          <div className="row">
            <span className="grow ellipsis">{email}</span>
            <button type="button" className="mini-btn" onClick={() => signOut()}>
              로그아웃
            </button>
          </div>
          {isCreator && (
            <label className="row">
              <span className="grow">제작자 모드</span>
              <input className="toggle" type="checkbox" checked={creatorOn} onChange={(e) => onCreator(e.target.checked)} />
            </label>
          )}
        </div>
        <p className="ui-caption">로그인해 두면 다른 기기에서도 생년월일시를 다시 넣지 않아도 돼요.</p>
      </>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const r = mode === 'login' ? await signIn(form.email.trim(), form.password) : await signUp(form.email.trim(), form.password);
    setBusy(false);
    setMessage(r.ok ? (r.note ?? '') : r.error);
  };

  return (
    <form onSubmit={submit}>
      <p className="ui-caption">계정 · 로그인하면 내 정보를 기억하고 제작자에게 피드백을 보낼 수 있어요</p>
      <div className="group">
        <label className="row">
          <span>이메일</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
        </label>
        <label className="row">
          <span>비밀번호</span>
          <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="6자 이상" />
        </label>
      </div>
      <p className="ui-caption" role="status">
        {message}
      </p>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? '잠시만요…' : mode === 'login' ? '로그인' : '가입하기'}
      </button>
      <button
        className="btn secondary"
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setMessage('');
        }}
      >
        {mode === 'login' ? '처음이에요 · 가입하기' : '이미 계정이 있어요 · 로그인'}
      </button>
    </form>
  );
}

/** 설정 셋째 칸: 보통은 피드백 보내기, 제작자 모드에서는 받은 피드백 목록 */
export function FeedbackPanel({ email, creatorOn }: { email?: string; creatorOn: boolean }) {
  // 서버 주소가 없으면(로그인 기능을 켜기 전) 계정·피드백 화면을 감춘다
  if (!supabase) return <h2 className="h-display">저장과 안내</h2>;
  if (creatorOn) return <FeedbackInbox />;
  return (
    <>
      <h2 className="h-display">제작자에게 피드백</h2>
      {email ? <FeedbackForm /> : <p className="h-note">설정 &gt; 계정에서 로그인하면 제작자에게 의견을 보낼 수 있어요.</p>}
    </>
  );
}

function FeedbackForm() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        const r = await sendFeedback(text.trim());
        setBusy(false);
        if (r.ok) setText('');
        setMessage(r.ok ? '보냈어요. 고마워요!' : r.error);
      }}
    >
      <label className="sr-only" htmlFor="feedback-text">
        피드백 내용
      </label>
      <textarea id="feedback-text" className="feedback-input" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="불편했던 점, 바랐던 기능, 틀린 점수 같은 걸 적어 주세요" />
      <p className="ui-caption" role="status">
        {message}
      </p>
      <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
        {busy ? '보내는 중…' : '보내기'}
      </button>
    </form>
  );
}

function FeedbackInbox() {
  const [items, setItems] = useState<Feedback[] | null>(null);
  const [error, setError] = useState('');
  const load = async () => {
    const r = await listFeedback();
    setItems(r.items);
    setError(r.error ?? '');
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <div className="inbox-head">
        <h2 className="h-display">받은 피드백 {items ? items.length : ''}</h2>
        <button type="button" className="mini-btn" onClick={load}>
          새로고침
        </button>
      </div>
      {error && <p className="h-note">{error}</p>}
      {items?.length === 0 && !error && <p className="h-note">아직 받은 피드백이 없어요.</p>}
      {items?.map((f) => (
        <article key={f.id} className="sticky">
          <div className="t">
            {f.email} · {new Date(f.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="d">{f.message}</div>
        </article>
      ))}
    </>
  );
}
