import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { NotificationProvider } from './components/NotificationContext';

// Register service worker for PWA offline capabilities and install prompt
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <NotificationProvider>
    <App />
  </NotificationProvider>
);
