import { defineConfig } from "astro/config"

export default defineConfig({
  base: "/inference-providers/",
  outDir: "dist",
  trailingSlash: "ignore",
  // The site CSS is small; inlining it keeps every page self-contained (the
  // design tokens, header, and @font-face rules ship in the HTML itself).
  build: {
    inlineStylesheets: "always",
  },
})
