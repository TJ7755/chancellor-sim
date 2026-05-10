import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/chancellor-sim/',
  build: {
    outDir: 'build',
    sourcemap: true,
  },
})
