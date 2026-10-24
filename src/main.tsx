import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './designs.css';

// 디자인 버전 비교용: ?design=hanji|minimal|diary|pixel (없으면 기본 스프링 메모장)
const design = new URLSearchParams(location.search).get('design');
if (design) document.documentElement.dataset.design = design;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
