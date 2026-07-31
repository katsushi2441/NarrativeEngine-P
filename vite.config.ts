import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import packageJson from './package.json'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  // Use relative asset paths so index.html works when loaded via Electron's
  // loadFile() (file:// protocol). Without this, Vite emits /assets/... which
  // resolves to the filesystem root, not the dist folder.
  base: './',
  server: {
    // A dev machine that already runs other watchers can exhaust the kernel's
    // inotify budget (fs.inotify.max_user_instances, 128 by default), and Vite
    // then dies at startup with ENOSPC on `watch` — which reads like a disk
    // problem but is not. Polling costs a little CPU and needs no root, so it
    // is opt-in via env rather than a hard default:
    //
    //   CHOKIDAR_USEPOLLING=1 npm run dev
    watch: process.env.CHOKIDAR_USEPOLLING
      ? { usePolling: true, interval: 300 }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
