import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './designs.css';
import './phone.css';

// 기본은 폴더폰 문자함. 비교용: ?design=notepad(이전 스프링 메모장)|hanji|minimal|diary|pixel
const design = new URLSearchParams(location.search).get('design') ?? 'phone';
if (design !== 'notepad') document.documentElement.dataset.design = design;

// 휴대폰 키보드가 올라오면 화면 높이가 줄어드는 브라우저가 있다. 키보드가 없을 때의 높이를 기억해 틀 높이로 쓰고,
// 입력 중에 생긴 높이 변화는 무시한다 (회전하면 다시 잰다)
const typing = () => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
const measure = (force = false) => {
  if (force || !typing()) document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
};
measure(true);
addEventListener('resize', () => measure());
addEventListener('orientationchange', () => setTimeout(() => measure(true), 300));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
