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
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'apple-splash-1284x2778.png'],
      manifest: {
        name: 'OneCampus',
        short_name: 'OneCampus',
        description: 'OneCampus Management System',
        // Static fallback for the initial launch/task-switcher tint, before
        // ConfigContext.jsx can update the live <meta name="theme-color">
        // tag to track the active theme — matches the default "slate"
        // theme's --sidebar-bg. background_color is the launch-screen
        // background Android composites behind the icon while the app is
        // still loading (only shown for an installed/standalone launch,
        // never a regular browser tab) — white per the requested launch
        // screen design; see index.html's apple-touch-startup-image for the
        // matching iOS version, which needs an explicit image rather than
        // relying on the manifest.
        theme_color: '#1C2230',
        background_color: '#FFFFFF',
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
