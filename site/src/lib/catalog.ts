// Astro bundles pages together with the SDK, so the SDK's default catalog
// path (resolved from the SDK's own dist/) points into the build chunk tree
// instead of the repo root. Astro runs build and dev with the site package as
// the working directory, which is the stable anchor for the repo-root
// artifacts emitted by `pnpm emit`.
import { resolve } from "node:path"
import { loadCatalog, type SdkCatalog } from "@inference-providers/sdk"

export const catalog: SdkCatalog = loadCatalog(
  resolve(process.cwd(), "../dist/catalog.json"),
)
