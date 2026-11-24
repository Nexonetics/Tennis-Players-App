/**
 * The app is exported with `trailingSlash: true`, so `usePathname()` returns
 * paths like `/rankings/`. Normalise before comparing against nav hrefs.
 */
export function normalizePath(path: string | null | undefined): string {
  if (!path) return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** True when `pathname` is `href` or a sub-route of it (home only matches exactly). */
export function isActivePath(pathname: string | null | undefined, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
}
