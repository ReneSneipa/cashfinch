import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true, // Browser automatisch öffnen
    watch: {
      // Datendateien vom File-Watcher ausschließen – sonst löst jedes
      // Speichern über die API einen vollständigen Browser-Reload aus.
      ignored: ['**/data/**', '**/config.json'],
    },
    proxy: {
      // API-Anfragen im Dev-Modus an den Express-Server weiterleiten
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Recharts ist groß – Warnung erst ab 600 KB anzeigen
    chunkSizeWarningLimit: 600,
  },
});
