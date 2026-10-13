import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5182,
    strictPort: true,
    watch: {
      // This project lives under OneDrive, where native FS watching throws
      // EBUSY on locked temp files and kills the dev server. Polling is the
      // reliable option on OneDrive / network / virtualised filesystems.
      usePolling: true,
      interval: 320,
    },
  },
})