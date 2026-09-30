import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely register PWA service worker in supported browser environments
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          updateSW(true);
        },
        onOfflineReady() {
          console.log('Haven is ready to work offline');
        },
      });
    })
    .catch(() => {
      // Benign fallback when virtual module isn't loaded in dev or iframe
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
