import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
   const env = loadEnv(mode, process.cwd(), "");
   return {
      base: env.VITE_BASE_URL || "/",
      plugins: [
         react(),
         tailwindcss(),
         {
            name: "preload-catalog-data",
            transformIndexHtml: {
               order: "post",
               handler(_html, context) {
                  if (!context.bundle) return [];
                  return Object.values(context.bundle)
                     .filter(chunk => chunk.type === "chunk" && ["demo", "catalogo", "shared"].includes(chunk.name))
                     .map(chunk => ({
                        tag: "link",
                        attrs: { rel: "modulepreload", crossorigin: "", href: `${env.VITE_BASE_URL || "/"}${chunk.fileName}` },
                        injectTo: "head" as const,
                     }));
               },
            },
         },
      ],
      test: {
         environment: "jsdom",
         include: ["tests/**/*.{test,spec}.{ts,tsx}"],
         setupFiles: ["./tests/setup.ts"],
         restoreMocks: true,
         coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/vite-env.d.ts"],
         },
      },
      build: {
         minify: "terser",
         terserOptions: {
            format: {
               comments: false,
            },
            compress: {
               pure_funcs: ["console.log", "console.debug", "console.info", "alert"],
            },
         },
         rollupOptions: {
            treeshake: {
               moduleSideEffects: "no-external",
               propertyReadSideEffects: false,
            },
         },
      },
      resolve: {
         alias: {
            "@": path.resolve(__dirname, "./src"),
         },
      },
   };
});
