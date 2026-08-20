import { defineConfig } from "astro/config"

// Astro names bundled <script> entries after the page
// ("index.astro_astro_type_script_…") regardless of the module they load.
// The table-enhancement script is the only bundled script entry on the site,
// so rename those entries to the module name — pages then reference
// /_astro/table-enhance.<hash>.js. Everything else keeps Astro's defaults.
// Since Astro 7 (Vite 8 builds through the Environment API), output naming
// must be set under environments.client.build — the top-level build key no
// longer reaches the client bundle.
const entryFileName = (chunk) =>
  chunk.name.includes("type_script")
    ? "_astro/table-enhance.[hash].js"
    : "_astro/[name].[hash].js"

export default defineConfig({
  base: "/inference-providers/",
  outDir: "dist",
  trailingSlash: "ignore",
  // The site CSS is small; inlining it keeps every page self-contained (the
  // design tokens, header, and @font-face rules ship in the HTML itself).
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              entryFileNames: entryFileName,
            },
          },
        },
      },
    },
  },
})
