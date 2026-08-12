var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            devOptions: {
                enabled: true,
            },
            includeAssets: ["favicon.svg", "favicon-32x32.png", "apple-touch-icon.png"],
            manifest: {
                name: "HEMO-DATA — Plataforma de Indicadores Hemoterápicos",
                short_name: "HEMO-DATA",
                description: "Plataforma de indicadores hemoterápicos do projeto HEMO-ANGOLA.",
                theme_color: "#0b7285",
                background_color: "#f4fbfc",
                display: "standalone",
                start_url: "/",
                icons: [
                    {
                        src: "/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png"
                    },
                    {
                        src: "/pwa-maskable-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "maskable"
                    },
                    {
                        src: "/pwa-maskable-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            }
        }),
    ],
    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: {
            "/api": {
                target: (_a = process.env.VITE_API_PROXY_TARGET) !== null && _a !== void 0 ? _a : "http://localhost:8000",
                changeOrigin: true,
            },
            "/admin": {
                target: (_b = process.env.VITE_API_PROXY_TARGET) !== null && _b !== void 0 ? _b : "http://localhost:8000",
                changeOrigin: true,
            }
        }
    }
});
