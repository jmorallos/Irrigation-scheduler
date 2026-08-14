import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './components/AppShell';
import AppRoutes from './AppRoutes';
import { seedIfEmpty } from './db/seedData';

async function clearStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export default function App() {
  useEffect(() => {
    seedIfEmpty().catch(console.error);

    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else if (saved === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }

    // Old Figma/Workbox workers cache broken assets. Clear them first.
    clearStaleServiceWorkers()
      .then(() => {
        // Only register our SW in production builds.
        if (import.meta.env.PROD && 'serviceWorker' in navigator) {
          return navigator.serviceWorker.register('/sw.js');
        }
      })
      .catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
}
