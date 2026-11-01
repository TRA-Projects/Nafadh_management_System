/**
 * Pins open `[data-row-actions-menu] [role="menu"]` panels with `position: fixed` so their
 * absolutely-positioned dropdowns are not clipped by the table/card scroll containers (AG Grid
 * cells, `overflow: hidden`/`auto` wrappers) they live inside. Call once at app bootstrap;
 * returns a disposer.
 *
 * Scope: this only handles the many *local* per-page action menus (`.jap-actions-menu`,
 * `.imt-actions-menu-wrap`, …) that have no positioning logic of their own. The shared
 * `RowActionsMenuComponent` (`.paged-list-actions-menu`) already owns correct, trigger-relative,
 * RTL-aware, self-clamping positioning via `reposition()` + `[ngStyle]`, so its panels are
 * deliberately skipped here to avoid two uncoordinated authorities fighting over the same inline
 * style.
 */
export function installRowActionsMenuOverlay(): () => void {
  const clearInline = (menu: HTMLElement): void => {
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.right = '';
    menu.style.bottom = '';
    menu.style.zIndex = '';
    menu.style.minWidth = '';
    menu.style.insetInlineEnd = '';
    menu.style.insetInlineStart = '';
  };

  const placeMenu = (menu: HTMLElement): void => {
    const wrap = menu.closest('[data-row-actions-menu]') as HTMLElement | null;
    if (!wrap) {
      return;
    }
    // The ⋮ trigger is the wrapper's button that is NOT inside the open menu panel
    // (menu-item buttons also match `button`, so exclude anything under a `[role="menu"]`).
    const trigger = Array.from(wrap.querySelectorAll<HTMLElement>('button')).find(
      (btn) => !btn.closest('[role="menu"]')
    );
    if (!trigger) {
      return;
    }
    // `offsetParent` is null when an ancestor is `display:none` (e.g. the hidden card/table twin
    // at the current breakpoint) — never position a trigger that isn't actually on screen.
    if (trigger.offsetParent === null) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
    const gap = 4;
    const viewportPad = 8;

    menu.style.position = 'fixed';
    menu.style.zIndex = '10050';
    menu.style.insetInlineEnd = 'auto';
    menu.style.insetInlineStart = 'auto';
    menu.style.bottom = 'auto';
    menu.style.minWidth = `${Math.max(triggerRect.width, 11.5 * 16)}px`;

    // Measure after fixed so width is available.
    const menuWidth = Math.max(menu.offsetWidth, 11.5 * 16);
    const menuHeight = menu.offsetHeight || 160;

    let top = triggerRect.bottom + gap;
    if (top + menuHeight > window.innerHeight - viewportPad && triggerRect.top > menuHeight + gap) {
      top = triggerRect.top - menuHeight - gap;
    }
    top = Math.max(viewportPad, Math.min(top, window.innerHeight - menuHeight - viewportPad));

    // Align the menu's end edge to the trigger: in LTR the right edges meet, in RTL the left
    // edges meet, so the panel opens toward the reading start in both directions.
    let left = rtl ? triggerRect.left : triggerRect.right - menuWidth;
    left = Math.max(viewportPad, Math.min(left, window.innerWidth - menuWidth - viewportPad));

    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.right = 'auto';
  };

  const syncAll = (): void => {
    document
      .querySelectorAll<HTMLElement>('[data-row-actions-menu] [role="menu"]')
      .forEach((menu) => {
        // The shared RowActionsMenuComponent positions itself — leave it alone.
        if (menu.classList.contains('paged-list-actions-menu')) {
          return;
        }
        placeMenu(menu);
      });
  };

  const scheduleSync = (): void => {
    // Double rAF: wait until Angular has inserted the menu and laid it out.
    requestAnimationFrame(() => requestAnimationFrame(syncAll));
  };

  const observer = new MutationObserver(scheduleSync);

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('scroll', syncAll, true);
  window.addEventListener('resize', syncAll);

  // Initial pass (usually empty).
  scheduleSync();

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', syncAll, true);
    window.removeEventListener('resize', syncAll);
    document
      .querySelectorAll<HTMLElement>('[data-row-actions-menu] [role="menu"]')
      .forEach((menu) => {
        if (!menu.classList.contains('paged-list-actions-menu')) {
          clearInline(menu);
        }
      });
  };
}
