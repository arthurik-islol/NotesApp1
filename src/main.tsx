import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign WebSocket / HMR connection errors in the sandbox environment
if (typeof window !== 'undefined') {
  // Override console.error and console.warn to suppress WebSocket errors from cluttering the console
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = function (...args) {
    const msg = args.map(arg => String(arg)).join(' ');
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('WebSocket connection') ||
      msg.includes('closed without opened') ||
      msg.includes('[vite] failed to connect')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = function (...args) {
    const msg = args.map(arg => String(arg)).join(' ');
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('WebSocket connection') ||
      msg.includes('closed without opened') ||
      msg.includes('[vite] failed to connect')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('WebSocket connection') ||
      msg.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('WebSocket connection') ||
      msg.includes('closed without opened')
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
