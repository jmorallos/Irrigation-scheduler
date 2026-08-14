import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppShell from './components/AppShell';
import AppRoutes from './AppRoutes';
import { cleanupDuplicatePrograms } from './db/cleanupDuplicates';

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
    cleanupDuplicatePrograms().catch(console.error);

    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
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
