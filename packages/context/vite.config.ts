import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const relPath = (path: string): string => resolve(__dirname, path);

export default defineConfig({
  build: {
    target: "esnext",
    minify: "oxc",
    lib: {
      entry: relPath("src/index.ts"),
      fileName: "index",
      formats: ["cjs", "es"]
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
