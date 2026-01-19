import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __VITE_ENV__: 'import.meta.env'
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'HomeListingAI',
        short_name: 'HomeListingAI',
        description: 'AI-Powered Real Estate Assistant',
        theme_color: '#ffffff',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: '/newlogo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/newlogo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    // Prevent multiple React copies which cause "Invalid hook call"
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],

          ui: ['@google/genai']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 4173,
    host: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
