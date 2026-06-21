// Eksport listy zgłoszeń do CSV i PDF — bez dodatkowych zależności.
// CSV pobierany jako plik; PDF realizowany przez okno wydruku przeglądarki
// (użytkownik wybiera „Zapisz jako PDF").

// Kolumny eksportu: [nagłówek, funkcja wyciągająca wartość z wiersza].
const COLUMNS = [
  ["ID", (r) => r.id],
  ["Tytuł", (r) => r.title],
  ["Opis", (r) => r.description],
  ["Status", (r) => r.status],
  ["Priorytet", (r) => r.priority],
  ["Wykonawca", (r) => r.wykonawcaName ?? r.contractorId ?? ""],
  ["Termin", (r) => (r.deadline ? r.deadline.slice(0, 10) : "")],
  ["Utworzono", (r) => (r.createdAt ? r.createdAt.slice(0, 10) : "")],
  ["Email", (r) => r.email ?? ""],
];

const escapeCsv = (value) => {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCsv = (rows, filename = "zgloszenia.csv") => {
  const header = COLUMNS.map(([h]) => escapeCsv(h)).join(";");
  const lines = rows.map((r) =>
    COLUMNS.map(([, get]) => escapeCsv(get(r))).join(";"),
  );
  // BOM dla poprawnych polskich znaków w Excelu.
  const csv = "﻿" + [header, ...lines].join("\r\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    filename,
  );
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

export const exportPdf = (rows, title = "Zgłoszenia") => {
  const head = COLUMNS.map(([h]) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${COLUMNS.map(([, get]) => `<td>${escapeHtml(get(r))}</td>`).join("")}</tr>`,
    )
    .join("");

  const win = window.open("", "_blank");
  if (!win) return; // popup zablokowany
  win.document
    .write(`<!doctype html><html lang="pl"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h1 { font-size: 18px; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
</style></head><body>
  <h1>${escapeHtml(title)} (${rows.length})</h1>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
};
