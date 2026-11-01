import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './designs.css';
import './phone.css';

// 기본은 폴더폰 문자함. 비교용: ?design=notepad(이전 스프링 메모장)|hanji|minimal|diary|pixel
const design = new URLSearchParams(location.search).get('design') ?? 'phone';
if (design !== 'notepad') document.documentElement.dataset.design = design;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
