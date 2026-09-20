import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { seedLibraryIfNeeded } from './data/seed';

// Seed the workout library into IndexedDB on startup (no-op after the first run).
// We don't block rendering on it — screens read the DB reactively.
seedLibraryIfNeeded().catch((err) => console.error('Library seed failed:', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
