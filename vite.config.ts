import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // Explicitly listing entries stops Vite from scanning everything in public/
    entries: [
      'index.html',
      'src/**/*.{ts,tsx,vue}'
    ],
    exclude: [
      'three', 
      'cannon', 
      '@emotion/is-prop-valid', 
      '@enjoy7ech/game-core'
    ]
  },
  server: {
    // Ensure static assets in public are always served
    fs: {
      strict: true,
      allow: ['..']
    }
  }
})
