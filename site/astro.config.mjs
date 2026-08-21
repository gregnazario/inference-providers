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

const BASE = "/inference-providers/"

export default defineConfig({
  base: BASE,
  outDir: "dist",
  trailingSlash: "ignore",
  // The models list is the landing page: / redirects there. On a static
  // build Astro emits a meta-refresh page at dist/index.html for this. The
  // destination includes the base — Astro uses `to` verbatim, and GitHub
  // Pages serves this site under /inference-providers/.
  redirects: {
    "/": `${BASE}models/`,
  },
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
