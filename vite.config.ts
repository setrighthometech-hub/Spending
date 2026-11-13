import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' lets the app work from any web address (for example GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Spending',
        short_name: 'Spending',
        description: 'Track money in and spending by pot, store and day.',
        start_url: './',
        display: 'standalone',
        background_color: '#fbf7f4',
        theme_color: '#b5577b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  test: { include: ['tests/**/*.test.ts'] }
})
