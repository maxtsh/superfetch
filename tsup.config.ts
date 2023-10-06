import { defineConfig } from "tsup";

export default defineConfig({
  target: ["es2020"],
  entry: ["./src/index.ts"],
  treeshake: true,
  minify: true,
  format: "esm",
  clean: true,
  sourcemap: false,
  splitting: false,
  dts: true,
});
