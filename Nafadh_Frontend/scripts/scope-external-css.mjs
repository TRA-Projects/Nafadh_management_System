// Generates public/external-system/css/style.scoped.css from style.css (legacy Tailwind/Vristo build).
// Every rule is limited to the <ext-system-host> subtree so it cannot affect the rest of the portal.
// Usage: node scripts/scope-external-css.mjs
import fs from 'node:fs';
import postcss from 'postcss';

const HOST = 'ext-system-host';
const input = 'public/external-system/css/style.css';
const output = 'public/external-system/css/style.scoped.css';

// style.css contains a malformed declaration (`color: color: #00338D`) that postcss rejects; repair it before parsing.
const source = fs.readFileSync(input, 'utf8').replace(/color:\s*color:/g, 'color:');
const root = postcss.parse(source);

function scopeSelector(sel) {
  const s = sel.trim();
  if (!s) return null;
  // Rules about the document itself can never match inside the host.
  if (/^(html|body|:root)(?![\w-])/.test(s)) return null;
  // Theme / direction flags live on ancestors of the host (e.g. `.dark` on the shell, `dir` on <html>).
  const anc = s.match(/^(\.dark|\[dir=["']?(?:rtl|ltr)["']?\])\s+(.*)$/);
  if (anc) return `${anc[1]} ${HOST} ${anc[2]}`;
  return `${HOST} ${s}`;
}

root.walkRules((rule) => {
  const parent = rule.parent;
  if (parent && parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
  const next = rule.selectors.map(scopeSelector).filter(Boolean);
  if (next.length === 0) {
    rule.remove();
  } else {
    rule.selectors = next;
  }
});

// Remove at-rules that became empty after dropping document-level rules.
root.walkAtRules((at) => {
  if (at.nodes && at.nodes.length === 0 && /^(media|supports|layer)$/i.test(at.name)) at.remove();
});

fs.writeFileSync(output, root.toString());
console.log(`Wrote ${output}`);
