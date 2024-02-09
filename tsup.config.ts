import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    minify: true,
    splitting: false,
    sourcemap: true,
    clean: true,
});
