import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWA } from './utils/pwaUpdater';
import { NotificationProvider } from './components/NotificationContext';

// Register service worker for PWA offline capabilities, install prompt, and manual update checks
initPWA();

createRoot(document.getElementById('root')!).render(
  <NotificationProvider>
    <App />
  </NotificationProvider>
);
