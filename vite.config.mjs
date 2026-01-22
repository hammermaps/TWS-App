import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-icon.png', 'android-icon-192x192.png'],
      manifest: {
        name: 'WLS Leerstandsspülung App',
        short_name: 'WLS App',
        description: 'Wasser-Leerstandsspülung Verwaltung mit Offline-Unterstützung',
        theme_color: '#321fdb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/android-icon-36x36.png',
            sizes: '36x36',
            type: 'image/png',
            density: '0.75'
          },
          {
            src: '/android-icon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
            density: '1.0'
          },
          {
            src: '/android-icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            density: '1.5'
          },
          {
            src: '/android-icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            density: '2.0'
          },
          {
            src: '/android-icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            density: '3.0'
          },
          {
            src: '/android-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            density: '4.0',
            purpose: 'any maskable'
          }
        ]
      },
      // Workbox / navigation fallback: serve index.html for SPA navigation requests
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.php',
        // exclude API and static resource paths from navigation fallback
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/stats\//,
          /^\/workbox-.*\.js$/,
          /\/.+\.[a-zA-Z0-9]{1,5}$/ // files with extensions (images, css, js)
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 Stunden
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache same-origin /stats routes as well (server API now lives on root /stats)
            urlPattern: /^\/stats\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stats-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true, // PWA auch im Development-Modus aktivieren
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    cors: true,
    proxy: {
      // API-Proxy für Backend-Anfragen
      '/api': {
        target: 'https://wls.dk-automation.de',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 Proxy Error:', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📤 Sending Request:', req.method, req.url)
            // Stelle sicher, dass JSON-Headers für alle Requests gesetzt sind
            proxyReq.setHeader('Content-Type', 'application/json')
            proxyReq.setHeader('Accept', 'application/json')
            // X-Requested-With Header für Backend-Erkennung
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest')
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 Received Response:', proxyRes.statusCode, req.url)
            console.log('📋 Response Headers:', proxyRes.headers)
          })
        }
      },
      // Proxy für /stats - leitet gleiche Pfade an Backend weiter (keine Pfad-Rewrite nötig)
      '/stats': {
        target: 'https://wls.dk-automation.de',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 Proxy Error (stats):', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Content-Type', 'application/json')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest')
          })
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Warn-Limit leicht erhöhen und manuelle Chunk-Aufteilung zur Verkleinerung großer Bundles
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return null
          // Drittanbieter-Bibliotheken bündeln
          if (id.includes('node_modules')) {
            // Versuche Paketname aus Pfad zu extrahieren
            const parts = id.split('node_modules/')[1].split('/')
            let pkg = parts[0]
            // Scoped package (@scope/name)
            if (pkg && pkg.startsWith('@') && parts.length > 1) {
              pkg = `${pkg}/${parts[1]}`
            }

            // Liste großer Pakete, die eigene Chunks bekommen sollen
            const largePkgs = [
              '@coreui', '@coreui/vue', 'coreui', 'vue', 'axios', 'workbox-window', 'chart.js'
            ]

            for (const lp of largePkgs) {
              if (id.includes(lp)) {
                // normalize chunk name
                const name = lp.replace('/', '_').replace('@', '').replace(/[^a-zA-Z0-9_]/g, '')
                return `vendor_${name}`
              }
            }

            // Scoped names replace slashes for chunk filename
            const pkgName = pkg.replace('/', '_').replace('@', '')
            // Small packages zusammenfassen
            return `vendor_${pkgName}`
          }

          // Große Views / Komponenten in eigene Chunks
          if (id.includes('/src/views/dashboard') || id.includes('/src/views/dashboard/')) return 'dashboard'
          if (id.includes('/src/views/apartments') || id.includes('/src/views/apartments/')) return 'apartments'
          if (id.includes('/src/views/apartments') && id.includes('Flush')) return 'apartment-flush'
          if (id.includes('/src/views/pages/ProfileView') || id.includes('/src/views/pages/Profile')) return 'profile'
          if (id.includes('/src/components/QRCodeScanner') || id.includes('/src/views/QR')) return 'qrscanner'

          // Fallback: keine besondere Chunk-Aufteilung
          return null
        }
      }
    }
  }
})
