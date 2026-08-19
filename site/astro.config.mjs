import { defineConfig } from "astro/config"

export default defineConfig({
  base: "/inference-providers/",
  outDir: "dist",
  trailingSlash: "ignore",
})
