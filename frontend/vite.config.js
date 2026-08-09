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
            manifest: {
                name: "HEMO-ANGOLA Prototype",
                short_name: "HEMO-ANGOLA",
                description: "Protótipo pré-submissão offline-first da plataforma HEMO-ANGOLA.",
                theme_color: "#0f3d56",
                background_color: "#f4f7f9",
                display: "standalone",
                start_url: "/",
                icons: [
                    {
                        src: "/pwa-192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "/pwa-512.png",
                        sizes: "512x512",
                        type: "image/png"
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
