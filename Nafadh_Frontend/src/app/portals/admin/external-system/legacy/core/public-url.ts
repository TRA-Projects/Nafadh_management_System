/** Read `<base href>` from the document (set at build time for GitHub/GitLab Pages). */
export function readAppBaseHref(): string {
  if (typeof document === 'undefined') {
    return '/';
  }
  const raw = document.querySelector('base')?.getAttribute('href') ?? '/';
  if (!raw || raw === '/') {
    return '/';
  }
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function basePathNoSlash(): string {
  return readAppBaseHref().replace(/\/$/, '');
}

/** True when `path` is already rooted under the deploy base (idempotent guard). */
export function isPublicUrlResolved(path: string): boolean {
  const base = basePathNoSlash();
  if (!base || base === '') {
    return true;
  }
  const trimmed = path.trim();
  return trimmed === base || trimmed.startsWith(`${base}/`);
}

/**
 * Prefix app-root paths (`/images/…`, `/assets/…`, `/css/…`) with the deploy base href.
 * Idempotent — safe to call repeatedly (avoids `/base/base/...` loops).
 */
export function resolvePublicUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) {
    return trimmed;
  }
  if (!trimmed.startsWith('/')) {
    return trimmed;
  }
  const base = readAppBaseHref();
  if (base === '/') {
    return trimmed;
  }
  if (isPublicUrlResolved(trimmed)) {
    return trimmed;
  }
  const baseNoSlash = base.replace(/\/$/, '');
  return `${baseNoSlash}${trimmed}`;
}

function fixInlineStyleUrls(style: string): string {
  return style.replace(/url\(\s*(['"]?)(\/[^'")]+)\1\s*\)/gi, (_match, quote, urlPath: string) => {
    const resolved = resolvePublicUrl(urlPath);
    return resolved === urlPath ? _match : `url(${quote}${resolved}${quote})`;
  });
}

function fixImageElement(img: HTMLImageElement): void {
  const attr = img.getAttribute('src');
  if (!attr || !attr.startsWith('/') || attr.startsWith('//') || isPublicUrlResolved(attr)) {
    return;
  }
  const next = resolvePublicUrl(attr);
  if (attr !== next) {
    img.setAttribute('src', next);
  }
}

function fixStyledElement(el: HTMLElement): void {
  const style = el.getAttribute('style');
  if (!style || !style.includes('url(')) {
    return;
  }
  const next = fixInlineStyleUrls(style);
  if (next !== style) {
    el.setAttribute('style', next);
  }
}

let rewriteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let publicAssetObserver: MutationObserver | null = null;

function scheduleRewritePublicAssetUrls(): void {
  if (rewriteDebounceTimer) {
    globalThis.clearTimeout(rewriteDebounceTimer);
  }
  rewriteDebounceTimer = globalThis.setTimeout(() => {
    rewriteDebounceTimer = null;
    rewritePublicAssetUrls();
  }, 50);
}

function nodeNeedsPublicAssetRewrite(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  if (node instanceof HTMLImageElement && node.getAttribute('src')?.startsWith('/') && !node.getAttribute('src')?.startsWith('//')) {
    return !isPublicUrlResolved(node.getAttribute('src') ?? '');
  }
  return Boolean(node.querySelector('img[src^="/"]:not([src^="//"])'));
}

/** Watch for late-rendered markup (lazy routes, @for rows) and rewrite root-absolute assets. */
function installPublicAssetUrlObserver(): void {
  if (typeof document === 'undefined' || readAppBaseHref() === '/' || publicAssetObserver) {
    return;
  }

  publicAssetObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement && mutation.attributeName === 'src') {
        fixImageElement(mutation.target);
        continue;
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'style' && mutation.target instanceof HTMLElement) {
        fixStyledElement(mutation.target);
        continue;
      }
      if (mutation.type !== 'childList') {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (nodeNeedsPublicAssetRewrite(node)) {
          scheduleRewritePublicAssetUrls();
          return;
        }
      }
    }
  });

  publicAssetObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'style'],
  });
}

/** Rewrite root-absolute static assets for subpath deploys (e.g. GitHub Pages). Safe to call repeatedly. */
export function rewritePublicAssetUrls(): void {
  if (typeof document === 'undefined' || readAppBaseHref() === '/') {
    return;
  }

  document.querySelectorAll('img[src^="/"]').forEach((node) => fixImageElement(node as HTMLImageElement));
  document.querySelectorAll('[style*="url("], [style*="url(\'"]').forEach((node) =>
    fixStyledElement(node as HTMLElement)
  );
}

/** Bootstrap hook — initial pass + observer for lazy-rendered markup (action icons, table rows). */
export function installPublicAssetUrlRewriter(): void {
  rewritePublicAssetUrls();
  globalThis.setTimeout(rewritePublicAssetUrls, 0);
  installPublicAssetUrlObserver();
}
