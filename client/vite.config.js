import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  // Keep the app and the workspace-level Remotion player on one React instance.
  resolve: { dedupe: ['react', 'react-dom', 'remotion'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
