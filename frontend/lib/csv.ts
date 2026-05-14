// Shared CSV export helpers — used by the admin orders and payments ledgers.

type CsvValue = string | number | null | undefined

export function csvEscape(value: CsvValue) {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Build a CSV from headers + rows and trigger a browser download. */
export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
