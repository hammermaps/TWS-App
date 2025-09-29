import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Ensure a Web Crypto compatible `crypto.getRandomValues` exists in the Node environment
// Vite and some deps expect `globalThis.crypto.getRandomValues` (Web API). Node 18+ exposes webcrypto.
// Only apply the insecure Math.random fallback in development to avoid shipping insecure code.
export default defineConfig(async () => {
  try {
    if (!globalThis.crypto || typeof (globalThis.crypto as any).getRandomValues !== 'function') {
      // Use Node's webcrypto if available
      const nodeCrypto = await import('node:crypto')
      if (nodeCrypto && (nodeCrypto as any).webcrypto) {
        ;(globalThis as any).crypto = (nodeCrypto as any).webcrypto
      } else if (process.env.NODE_ENV === 'development') {
        // Fallback minimal polyfill for getRandomValues - DEVELOPMENT ONLY
        ;(globalThis as any).crypto = {
          getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
            return arr
          },
        }
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      ;(globalThis as any).crypto = {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
          return arr
        },
      }
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.svg'],
        manifest: {
          name: 'tws-app',
          short_name: 'tws',
          description: 'A Vite + React PWA starter',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
            {
              src: '/icons/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          // minimal caching for assets and navigation
          navigateFallback: '/',
          globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': 'http://localhost:5000',
      },
    },
  }
})
