import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  envPrefix: 'VITE_', // Ensure VITE_ prefixed env vars are loaded
  server: {
    port: 5173,
    host: true
  }
})
