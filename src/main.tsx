import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWA } from './utils/pwaUpdater';
import { NotificationProvider } from './components/NotificationContext';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error('App Crashed:', error, errorInfo); }
  render() {
    if (this.state.hasError) return <div style={{padding: '20px', textAlign: 'center'}}><h1>Terjadi kesalahan</h1><p>Aplikasi gagal dimuat. Silakan <button onClick={() => window.location.reload()}>muat ulang</button>.</p></div>;
    return this.props.children;
  }
}

// Register service worker...
initPWA();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </ErrorBoundary>
);
