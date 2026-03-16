import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'firebase-messaging-sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'TutShop Marketplace',
        short_name: 'TutShop',
        description: 'Seu marketplace local confiável.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        gcm_sender_id: "538795891753",
        icons: [
          {
            src: '/app-icon-v3.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/app-icon-v3.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
});
