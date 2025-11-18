import { defineConfig } from "tsup";

export default defineConfig({
	clean: true,
	entry: ["src/index.ts"],
	experimentalDts: true,
	format: ["cjs", "esm"],
	minify: true,
	outDir: "dist",
	sourcemap: true,
	splitting: false,
});
