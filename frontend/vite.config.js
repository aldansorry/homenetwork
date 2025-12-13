import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

export default defineConfig({
  // server: {
  //   // https: {
  //   //   key: fs.readFileSync('192.168.0.200-key.pem'),
  //   //   cert: fs.readFileSync('192.168.0.200.pem'),
  //   // }
  // },
  // preview: {
  //   host: true,     // agar bisa diakses dari Android (via IP LAN)
  //   port: 3000,
  //   https: {
  //     key: fs.readFileSync('192.168.0.200-key.pem'),
  //     cert: fs.readFileSync('192.168.0.200.pem'),
  //   }
  // },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'], // opsional
      manifest: {
        name: 'Home Network',
        short_name: 'HN',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
