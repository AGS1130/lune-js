import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    alwaysBundle: [],
    onlyBundle: [],
    neverBundle: []
  },
  dts: { oxc: true },
  format: ["cjs", "esm"],
  target: "esnext"
});
