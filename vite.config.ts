import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'ניהול משימות וזמנים · סטודיו',
        short_name: 'סטודיו',
        description:
          'ניהול משימות, לקוחות ומעקב זמנים לעסק בניית אתרים — מה צריך לעשות לכל לקוח וכמה זמן לקח כל פרויקט',
        lang: 'he',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f6f9',
        theme_color: '#4f7cff',
        categories: ['productivity', 'business'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // קיצורי דרך בלחיצה ארוכה על האייקון בטלפון
        shortcuts: [
          {
            name: 'המשימות שלי',
            short_name: 'משימות',
            url: './#/tasks',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'יומן זמנים',
            short_name: 'זמנים',
            url: './#/time',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'דוחות',
            short_name: 'דוחות',
            url: './#/reports',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // האפליקציה כולה סטטית — מטמינים הכל ומקבלים עבודה מלאה אופליין
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      devOptions: {
        // מאפשר לבדוק את ה-service worker גם ב-npm run dev
        enabled: false,
      },
    }),
  ],
  base: './',
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/store.tsx'],
    },
  },
})
