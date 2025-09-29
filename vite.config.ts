import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ensure a Web Crypto compatible `crypto.getRandomValues` exists in the Node environment
// Vite and some deps expect `globalThis.crypto.getRandomValues` (Web API). Node 18+ exposes webcrypto,
// but in some environments or bundlings it can be missing/overwritten — we set it here early.
export default defineConfig(async () => {
  try {
    if (!globalThis.crypto || typeof (globalThis.crypto as any).getRandomValues !== 'function') {
      // Use Node's webcrypto if available
      // Note: dynamic import ensures this runs in Node and doesn't break bundlers.
      const nodeCrypto = await import('node:crypto')
      if (nodeCrypto && (nodeCrypto as any).webcrypto) {
        ;(globalThis as any).crypto = (nodeCrypto as any).webcrypto
      } else {
        // Fallback minimal polyfill for getRandomValues
        ;(globalThis as any).crypto = {
          getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
            return arr
          },
        }
      }
    }
  } catch (e) {
    // If anything goes wrong, provide a safe fallback implementation
    ;(globalThis as any).crypto = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
        return arr
      },
    }
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://localhost:5000',
      },
    },
  }
})
