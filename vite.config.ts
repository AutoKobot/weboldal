import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),

    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2020",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core – ritkán változik, jól cache-elhető
          "vendor-react": ["react", "react-dom"],
          // UI könyvtár
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-label",
            "@radix-ui/react-progress",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "lucide-react",
          ],
          // Adatkezelés
          "vendor-query": ["@tanstack/react-query"],
          // Markdown / diagram renderelés
          "vendor-markdown": ["react-markdown", "remark-gfm", "mermaid"],
        },
      },
    },
  },
});
