import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    alwaysBundle: [/^es-toolkit\//],
    onlyBundle: ["es-toolkit"],
    neverBundle: []
  },
  dts: { oxc: true },
  format: ["cjs", "esm"],
  target: "esnext"
});
