import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const relPath = (path: string): string => resolve(__dirname, path);

export default defineConfig({
  build: {
    target: "esnext",
    sourcemap: true,
    minify: "oxc",
    lib: {
      fileName: (format) => `index.${format}.js`,
      entry: relPath("src/index.ts"),
      name: "Lune",
      formats: ["es", "iife", "umd"]
    }
  },
  plugins: [
    dts({
      outDirs: {
        dir: "dist"
      }
    })
  ],
  resolve: {
    conditions: ["source"]
  }
});
