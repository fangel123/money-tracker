type Cell = string | number | null | undefined;

/**
 * CSV yang langsung terbuka rapi di Excel berbahasa Indonesia:
 * pemisah `;` (Excel lokal ID memakai `;`, bukan `,`), BOM UTF-8 untuk karakter non-ASCII,
 * dan baris CRLF.
 */
export function buildCsv(rows: Cell[][]): string {
  const escape = (value: Cell) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((row) => row.map(escape).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, rows: Cell[][]) {
  const url = URL.createObjectURL(new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
