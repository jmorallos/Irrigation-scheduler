import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/** Stub old Figma/vite-plugin-pwa virtual modules so stale cached HTML can boot. */
function legacyPwaCompat() {
  const VIRTUAL = '/@vite-plugin-pwa/pwa-entry-point-loaded'
  return {
    name: 'legacy-pwa-compat',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url === VIRTUAL || url === VIRTUAL + '/') {
          res.setHeader('Content-Type', 'application/javascript')
          res.end('// legacy vite-plugin-pwa stub\n')
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), legacyPwaCompat()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    // New port bypasses the stuck Workbox worker registered on :5173
    port: 5180,
    strictPort: true,
  },
})
