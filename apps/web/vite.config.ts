import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo-email.png", "og-image.png", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "FinLLM",
        short_name: "FinLLM",
        description: "Self-hosted personal ledger",
        theme_color: "#0d6b5c",
        background_color: "#f6f1e8",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  server: { port: 5173 },
});
