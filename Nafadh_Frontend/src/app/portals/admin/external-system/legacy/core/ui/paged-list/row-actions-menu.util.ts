/** True when the event originated from a ⋮ trigger or its dropdown (incl. body-portaled menu). */
export function eventFromRowActionsMenu(event: Event): boolean {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (node instanceof Element && node.closest('[data-row-actions-menu]')) {
      return true;
    }
  }
  const target = event.target;
  return target instanceof Element && !!target.closest('[data-row-actions-menu]');
}
