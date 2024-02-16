import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    outDir: "dist",
    minify: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    experimentalDts: true,
});
