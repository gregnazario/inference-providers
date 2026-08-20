/**
 * Progressive enhancement for the index tables (models, providers).
 * Targets `.table-wrap[data-enhance]`; without JS the tables render exactly
 * as authored (no controls, default order). The module reads facet and sort
 * metadata from data attributes on the table, injects a controls bar (text
 * filter + one select per facet + Reset), and wires header clicks for
 * sorting. Every dynamic value is attached via createElement/textContent —
 * never innerHTML — so catalog data cannot inject markup.
 */

type Facet = { key: string; label: string }
type Sort = { th: HTMLTableCellElement; key: string; type: string; dir: 1 | -1 }

/** Facet key "lab" reads its value from the data-facet-lab attribute. */
const facetAttr = (key: string): string => `facet${key.charAt(0).toUpperCase()}${key.slice(1)}`

/** A row's individual values for a facet: "a,b" splits to ["a","b"]. */
const rowValues = (tr: HTMLTableRowElement, key: string): string[] =>
  (tr.dataset[facetAttr(key)] ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)

const enhance = (wrap: HTMLElement): void => {
  const table = wrap.querySelector("table")
  const tbody = table?.tBodies[0]
  const head = table?.tHead?.rows[0]
  if (!table || !tbody || !head) return

  const rows = Array.from(tbody.rows, (tr, index) => ({ tr, index }))
  let facets: Facet[] = []
  try {
    facets = JSON.parse(table.dataset.facets ?? "[]") as Facet[]
  } catch {
    facets = []
  }
  let sort: Sort | null = null
  let query = ""
  const selected = new Map<string, string>() // facet key -> chosen value

  // Empty state row, kept last in the tbody and toggled by visibility.
  const emptyRow = document.createElement("tr")
  emptyRow.className = "table-empty"
  const emptyCell = document.createElement("td")
  emptyCell.colSpan = head.cells.length
  emptyCell.textContent = "No matching rows"
  emptyRow.appendChild(emptyCell)
  emptyRow.hidden = true
  tbody.appendChild(emptyRow)

  // Controls bar: text filter, one select per facet, Reset, count indicator.
  const bar = document.createElement("div")
  bar.className = "table-controls"

  const search = document.createElement("input")
  search.type = "search"
  search.placeholder = "Filter rows…"
  search.setAttribute("aria-label", "Filter table rows")
  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase()
    apply()
  })
  bar.appendChild(search)

  const selects: HTMLSelectElement[] = []
  for (const facet of facets) {
    const values = new Set<string>()
    for (const { tr } of rows) for (const v of rowValues(tr, facet.key)) values.add(v)
    const select = document.createElement("select")
    select.setAttribute("aria-label", `Filter by ${facet.label}`)
    for (const value of ["", ...[...values].sort()]) {
      const option = document.createElement("option")
      option.value = value
      option.textContent = value === "" ? `All ${facet.label}` : value
      select.appendChild(option)
    }
    select.addEventListener("change", () => {
      if (select.value === "") selected.delete(facet.key)
      else selected.set(facet.key, select.value)
      apply()
    })
    selects.push(select)
    bar.appendChild(select)
  }

  const reset = document.createElement("button")
  reset.type = "button"
  reset.textContent = "Reset"
  reset.hidden = true
  reset.addEventListener("click", () => {
    search.value = ""
    query = ""
    for (const select of selects) select.value = ""
    selected.clear()
    sort = null
    apply()
  })
  bar.appendChild(reset)

  const count = document.createElement("span")
  count.className = "table-count"
  bar.appendChild(count)

  // Sortable headers: the th keeps its markup server-side; the script wraps
  // the existing content in a button and owns aria-sort + arrow classes.
  const columns: { th: HTMLTableCellElement; key: string; type: string }[] = []
  for (const th of Array.from(head.cells)) {
    const key = th.dataset.sortKey
    if (!key) continue
    const type = th.dataset.sortType ?? "text"
    const button = document.createElement("button")
    button.type = "button"
    button.className = "sort-btn"
    while (th.firstChild) button.appendChild(th.firstChild)
    th.appendChild(button)
    button.addEventListener("click", () => {
      sort =
        sort && sort.th === th && sort.dir === 1
          ? { th, key, type, dir: -1 }
          : { th, key, type, dir: 1 }
      apply()
    })
    columns.push({ th, key, type })
  }

  function apply(): void {
    const visible = rows.filter(({ tr }) => {
      if (query && !(tr.textContent ?? "").toLowerCase().includes(query)) return false
      for (const [key, value] of selected) if (!rowValues(tr, key).includes(value)) return false
      return true
    })

    // Reorder the DOM when sorted; appendChild moves the live nodes (popover
    // open state included). Array sort stability keeps ties in source order.
    if (sort) {
      const { type, dir, th: sorted } = sort
      const index = sorted.cellIndex
      rows.sort((a, b) => {
        const va = a.tr.cells[index]?.dataset.sort ?? ""
        const vb = b.tr.cells[index]?.dataset.sort ?? ""
        if (va === "" || vb === "") {
          if (va === vb) return a.index - b.index
          return va === "" ? 1 : -1 // empty always last, regardless of direction
        }
        const base = type === "num" ? Number(va) - Number(vb) : va.localeCompare(vb)
        return base * dir
      })
    } else {
      rows.sort((a, b) => a.index - b.index)
    }
    for (const { tr } of rows) tbody.appendChild(tr)
    tbody.appendChild(emptyRow)

    const shown = new Set(visible.map((r) => r.tr))
    for (const { tr } of rows) tr.hidden = !shown.has(tr)
    emptyRow.hidden = visible.length > 0
    count.textContent = `${visible.length} of ${rows.length}`
    reset.hidden = !(query || selected.size > 0 || sort)

    for (const { th } of columns) {
      const active: Sort | null = sort && sort.th === th ? sort : null
      th.classList.toggle("sort-asc", active !== null && active.dir === 1)
      th.classList.toggle("sort-desc", active !== null && active.dir === -1)
      if (active) th.setAttribute("aria-sort", active.dir === 1 ? "ascending" : "descending")
      else th.removeAttribute("aria-sort")
    }
  }

  wrap.insertBefore(bar, table)
  apply()
}

for (const wrap of document.querySelectorAll<HTMLElement>(".table-wrap[data-enhance]")) {
  enhance(wrap)
}
