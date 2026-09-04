import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      "@semi-ui/css": path.resolve(__dirname, "node_modules/@douyinfe/semi-ui/dist/css/semi.css"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/ws": { target: "ws://127.0.0.1:8787", ws: true },
    },
  },
  build: {
    outDir: "web/dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // 提高警告阈值到 1000 KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 将大型依赖分离到独立 chunk
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            if (id.includes("@douyinfe/semi-ui")) {
              return "semi-ui";
            }
            if (id.includes("lightweight-charts")) {
              return "chart";
            }
            if (id.includes("lottie-web")) {
              return "lottie";
            }
          }
        },
      },
    },
  },
});
