/** Native browser PDF print is vector/text-based; unlike html2canvas it does not rasterize pages. */
export function escapeReportHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PrintReportSection {
  title: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  note?: string;
}

export function reportTablesHtml(sections: PrintReportSection[]): string {
  const e = escapeReportHtml;
  return sections.map(section => `<section class="section">
    <h2>${e(section.title)}</h2>
    ${section.note ? `<p class="note">${e(section.note)}</p>` : ''}
    <table><thead><tr>${section.headers.map(header => `<th>${e(header)}</th>`).join('')}</tr></thead><tbody>
    ${section.rows.length ? section.rows.map(row => `<tr>${section.headers.map((_, i) => `<td>${e(row[i] ?? '')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${section.headers.length}" class="empty">لا توجد بيانات مسجلة.</td></tr>`}
    </tbody></table>
  </section>`).join('');
}

/**
 * Must be called from the export button click (browser popup policy).
 * The user selects 'Save as PDF' in the browser print dialog; browsers do not
 * permit silently saving vector PDFs without a PDF engine/font embedding.
 */
export function openCompanyPrintReport(
  title: string,
  contentHtml: string,
  options: { landscape?: boolean; subtitle?: string } = {}
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const e = escapeReportHtml;
  const orientation = options.landscape ? 'landscape' : 'portrait';
  const date = new Date().toLocaleString('ar-OM');
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head>
    <meta charset="utf-8"><title>${e(title)}</title>
    <style>
      @page { size: A4 ${orientation}; margin: 13mm; }
      *{box-sizing:border-box}
      body{margin:0;direction:rtl;text-align:right;color:#17243d;background:#fff;font:11px/1.75 Tahoma,Arial,'Segoe UI',sans-serif}
      .report-head{border-bottom:3px solid #00338d;margin-bottom:14px;padding-bottom:10px}
      .report-head h1{font-size:20px;line-height:1.5;margin:0 0 4px;color:#00338d}
      .report-head p{font-size:10px;color:#64748b;margin:0}
      h2{font-size:14px;color:#00338d;margin:17px 0 8px;border-right:3px solid #00338d;padding-right:9px}
      .section{margin-bottom:18px}
      .note{font-size:10px;color:#64748b;margin:0 0 7px}
      table{width:100%;border-collapse:collapse;table-layout:auto;direction:rtl;font-size:10px}
      th,td{border:1px solid #dce4ef;padding:7px 8px;text-align:right;vertical-align:top;overflow-wrap:anywhere;white-space:normal}
      th{background:#edf3fc;font-weight:700;color:#0d337a}
      tbody tr:nth-child(even){background:#f8fafd}
      thead{display:table-header-group}tfoot{display:table-footer-group}
      tr{break-inside:avoid;page-break-inside:avoid}
      .empty{color:#64748b;text-align:center}
      .pdf-head{background:#00338d;color:#fff;border-radius:8px;padding:12px;margin-bottom:12px}
      .pdf-head h1{font-size:18px;margin:0;color:#fff}.pdf-head p{margin:0;color:#fff}
      .pdf-title{font-size:13px;font-weight:700;color:#00338d;margin:14px 0 7px;border-right:3px solid #00338d;padding-right:9px}
      .pdf-kpis{margin-bottom:14px}.pdf-kpis td{text-align:center;background:#f1f5fb}
      .pdf-kpis b{display:block;font-size:14px;color:#00338d}.pdf-kpis span{font-size:9px}
      .kv td:first-child{font-weight:bold;background:#f8fafc}
      .bar{height:5px;background:#e2e8f0;overflow:hidden;border-radius:2px}.bar i{display:block;height:100%;background:#0ea5e9}
      .foot,footer{color:#64748b;font-size:9px;margin-top:12px;border-top:1px solid #dce4ef;padding-top:8px}
      a{color:#0056b3}
      .actions{padding:11px 16px;background:#edf3fc;margin-bottom:16px;border-radius:8px;color:#334155;font-size:13px}
      .actions button{background:#00338d;color:#fff;border:0;border-radius:5px;padding:8px 14px;font:inherit;cursor:pointer;margin-left:12px}
      @media print{.actions{display:none!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      @media screen{body{max-width:1150px;margin:16px auto;padding:12px 22px;background:#fff}}
    </style></head><body>
    <div class="actions"><button onclick="window.print()">طباعة / حفظ PDF</button>
    لحفظ مستند PDF واضح بنص قابل للبحث: اختر «حفظ بتنسيق PDF» من الطابعة.</div>
    <header class="report-head"><h1>${e(title)}</h1><p>نظام نفاذ | بوابة الشركة | ${e(date)}</p>
    ${options.subtitle ? `<p>${e(options.subtitle)}</p>` : ''}</header>
    ${contentHtml}</body></html>`);
  printWindow.document.close();
  // Let the browser finish laying out text and loading locally installed Arabic fonts.
  void (printWindow.document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (!printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  });
  return true;
}
