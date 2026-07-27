// vite.config.js
import { defineConfig } from "file:///C:/Users/Ashique/OneDrive/Documents/OneCampus/client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Ashique/OneDrive/Documents/OneCampus/client/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/Ashique/OneDrive/Documents/OneCampus/client/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Only reference files that actually exist in public/ — the previous
      // list (favicon.ico, apple-touch-icon.png, masked-icon.svg) named
      // three files that were never added, so vite-plugin-pwa silently
      // dropped them rather than precaching/serving anything for iOS.
      // apple-splash-*: one startup image per iPhone/iPad screen size — iOS
      // only shows the one whose pixel size exactly matches the device, so
      // the whole set has to ship (see index.html's media-queried links).
      includeAssets: ["favicon.png", "apple-touch-icon.png", "apple-splash-*.png"],
      manifest: {
        name: "OneCampus",
        short_name: "OneCampus",
        description: "OneCampus Management System",
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
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        // Keeps an installed app anchored to the tenant app shell rather
        // than always relaunching at the public landing page.
        start_url: "/app",
        scope: "/",
        icons: [
          {
            src: "icon-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "icon-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          },
          {
            src: "icon-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBc2hpcXVlXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxPbmVDYW1wdXNcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBc2hpcXVlXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxPbmVDYW1wdXNcXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Bc2hpcXVlL09uZURyaXZlL0RvY3VtZW50cy9PbmVDYW1wdXMvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICAvLyBPbmx5IHJlZmVyZW5jZSBmaWxlcyB0aGF0IGFjdHVhbGx5IGV4aXN0IGluIHB1YmxpYy8gXHUyMDE0IHRoZSBwcmV2aW91c1xyXG4gICAgICAvLyBsaXN0IChmYXZpY29uLmljbywgYXBwbGUtdG91Y2gtaWNvbi5wbmcsIG1hc2tlZC1pY29uLnN2ZykgbmFtZWRcclxuICAgICAgLy8gdGhyZWUgZmlsZXMgdGhhdCB3ZXJlIG5ldmVyIGFkZGVkLCBzbyB2aXRlLXBsdWdpbi1wd2Egc2lsZW50bHlcclxuICAgICAgLy8gZHJvcHBlZCB0aGVtIHJhdGhlciB0aGFuIHByZWNhY2hpbmcvc2VydmluZyBhbnl0aGluZyBmb3IgaU9TLlxyXG4gICAgICAvLyBhcHBsZS1zcGxhc2gtKjogb25lIHN0YXJ0dXAgaW1hZ2UgcGVyIGlQaG9uZS9pUGFkIHNjcmVlbiBzaXplIFx1MjAxNCBpT1NcclxuICAgICAgLy8gb25seSBzaG93cyB0aGUgb25lIHdob3NlIHBpeGVsIHNpemUgZXhhY3RseSBtYXRjaGVzIHRoZSBkZXZpY2UsIHNvXHJcbiAgICAgIC8vIHRoZSB3aG9sZSBzZXQgaGFzIHRvIHNoaXAgKHNlZSBpbmRleC5odG1sJ3MgbWVkaWEtcXVlcmllZCBsaW5rcykuXHJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5wbmcnLCAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnLCAnYXBwbGUtc3BsYXNoLSoucG5nJ10sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogJ09uZUNhbXB1cycsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogJ09uZUNhbXB1cycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmVDYW1wdXMgTWFuYWdlbWVudCBTeXN0ZW0nLFxyXG4gICAgICAgIC8vIFN0YXRpYyBmYWxsYmFjayBmb3IgdGhlIGluaXRpYWwgbGF1bmNoL3Rhc2stc3dpdGNoZXIgdGludCwgYmVmb3JlXHJcbiAgICAgICAgLy8gQ29uZmlnQ29udGV4dC5qc3ggY2FuIHVwZGF0ZSB0aGUgbGl2ZSA8bWV0YSBuYW1lPVwidGhlbWUtY29sb3JcIj5cclxuICAgICAgICAvLyB0YWcgdG8gdHJhY2sgdGhlIGFjdGl2ZSB0aGVtZSBcdTIwMTQgbWF0Y2hlcyB0aGUgZGVmYXVsdCBcInNsYXRlXCJcclxuICAgICAgICAvLyB0aGVtZSdzIC0tc2lkZWJhci1iZy4gYmFja2dyb3VuZF9jb2xvciBpcyB0aGUgbGF1bmNoLXNjcmVlblxyXG4gICAgICAgIC8vIGJhY2tncm91bmQgQW5kcm9pZCBjb21wb3NpdGVzIGJlaGluZCB0aGUgaWNvbiB3aGlsZSB0aGUgYXBwIGlzXHJcbiAgICAgICAgLy8gc3RpbGwgbG9hZGluZyAob25seSBzaG93biBmb3IgYW4gaW5zdGFsbGVkL3N0YW5kYWxvbmUgbGF1bmNoLFxyXG4gICAgICAgIC8vIG5ldmVyIGEgcmVndWxhciBicm93c2VyIHRhYikgXHUyMDE0IHdoaXRlIHBlciB0aGUgcmVxdWVzdGVkIGxhdW5jaFxyXG4gICAgICAgIC8vIHNjcmVlbiBkZXNpZ247IHNlZSBpbmRleC5odG1sJ3MgYXBwbGUtdG91Y2gtc3RhcnR1cC1pbWFnZSBmb3IgdGhlXHJcbiAgICAgICAgLy8gbWF0Y2hpbmcgaU9TIHZlcnNpb24sIHdoaWNoIG5lZWRzIGFuIGV4cGxpY2l0IGltYWdlIHJhdGhlciB0aGFuXHJcbiAgICAgICAgLy8gcmVseWluZyBvbiB0aGUgbWFuaWZlc3QuXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjRkZGRkZGJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI0ZGRkZGRicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIC8vIEtlZXBzIGFuIGluc3RhbGxlZCBhcHAgYW5jaG9yZWQgdG8gdGhlIHRlbmFudCBhcHAgc2hlbGwgcmF0aGVyXHJcbiAgICAgICAgLy8gdGhhbiBhbHdheXMgcmVsYXVuY2hpbmcgYXQgdGhlIHB1YmxpYyBsYW5kaW5nIHBhZ2UuXHJcbiAgICAgICAgc3RhcnRfdXJsOiAnL2FwcCcsXHJcbiAgICAgICAgc2NvcGU6ICcvJyxcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdpY29uLTE5MngxOTIuc3ZnJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdpY29uLTUxMng1MTIuc3ZnJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdpY29uLTUxMng1MTIuc3ZnJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczXHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VixTQUFTLG9CQUFvQjtBQUN6WCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BUWQsZUFBZSxDQUFDLGVBQWUsd0JBQXdCLG9CQUFvQjtBQUFBLE1BQzNFLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBV2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBO0FBQUE7QUFBQSxRQUdULFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxRQUNQLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
