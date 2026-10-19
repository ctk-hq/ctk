import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "deployment-tags",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          const tags = process.env.CUSTOM_HEAD_HTML;

          return tags
            ? html.replace("</head>", () => `${tags}\n</head>`)
            : html;
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    css: true
  }
});
