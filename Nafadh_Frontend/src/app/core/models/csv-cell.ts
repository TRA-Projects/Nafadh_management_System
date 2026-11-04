export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\t\r\n]|^\s*[=+@\-＝＋＠－]/u.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}
