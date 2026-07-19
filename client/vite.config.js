import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only reference files that actually exist in public/ — the previous
      // list (favicon.ico, apple-touch-icon.png, masked-icon.svg) named
      // three files that were never added, so vite-plugin-pwa silently
      // dropped them rather than precaching/serving anything for iOS.
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'OneCampus',
        short_name: 'OneCampus',
        description: 'OneCampus Management System',
        // Static fallback for the initial launch/task-switcher tint, before
        // ConfigContext.jsx can update the live <meta name="theme-color">
        // tag to track the active theme — matches the default "slate"
        // theme's --sidebar-bg. background_color (splash screen) stays on
        // the light page background since that's what's behind the logo
        // while the app is still loading, not the header bar.
        theme_color: '#1C2230',
        background_color: '#F5F6F8',
        display: 'standalone',
        // Keeps an installed app anchored to the tenant app shell rather
        // than always relaunching at the public landing page.
        start_url: '/app',
        scope: '/',
        icons: [
          {
            src: 'icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});
