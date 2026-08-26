// Sitemap enumerating every crawlable page: static guides plus one route per
// canonical model and per provider surface, joined from the emitted catalog.
import { catalog } from "../lib/catalog"

const SITE = "https://gregnazario.github.io"
const BASE = import.meta.env.BASE_URL
const origin = `${SITE}${BASE}`

export function getStaticPaths() {
  return [{ params: {} }]
}

export const GET = () => {
  const modelIds = catalog.models.map((m) => m.id.replace("/", "-"))
  const providerIds = catalog.providers.map((p) => p.id)

  const paths = [
    "models/",
    "providers/",
    "free/",
    "search/",
    "download/",
    "help/",
    "verify.md",
    ...modelIds.map((id) => `models/${encodeURIComponent(id)}/`),
    ...providerIds.map((id) => `providers/${encodeURIComponent(id)}/`),
  ]
  // Sorted + deduped for stable diffs and scanner friendliness.
  const urls = [...new Set(paths)].sort().map((path) => {
    return `    <url><loc>${origin}${path}</loc></url>`
  })

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n")

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
