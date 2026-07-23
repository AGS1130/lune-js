import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    alwaysBundle: [/^@lune-js\//],
    onlyBundle: [],
    neverBundle: []
  },
  dts: { oxc: true },
  format: ["cjs", "esm", "iife", "umd"],
  minify: true,
  outputOptions: {
    name: "Lune"
  },
  target: "esnext"
});
