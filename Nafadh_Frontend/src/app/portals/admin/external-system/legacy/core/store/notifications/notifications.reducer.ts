import { createFeature, createReducer, on } from '@ngrx/store';

import type { UserNotificationDto } from '../../api/models/custom-notifications.models';
import { notificationsActions } from './notifications.actions';
import { notificationsInitialState } from './notifications.state';

function replaceRow(rows: UserNotificationDto[], row: UserNotificationDto): UserNotificationDto[] {
  return rows.map((r) => (r.Id === row.Id ? row : r));
}

function markAllRead(rows: UserNotificationDto[]): UserNotificationDto[] {
  return rows.map((r) => (r.IsRead ? r : { ...r, IsRead: true }));
}

export const notificationsFeature = createFeature({
  name: 'notifications',
  reducer: createReducer(
    notificationsInitialState,
    on(notificationsActions.cacheAdminPage, (state, { page }) => ({ ...state, adminPage: page })),
    on(notificationsActions.adminNotificationUpserted, (state, { row }) => ({
      ...state,
      adminSelected: row,
      adminPage: state.adminPage
        ? { ...state.adminPage, rows: state.adminPage.rows.map((r) => (r.Id === row.Id ? row : r)) }
        : state.adminPage,
    })),
    on(notificationsActions.cacheUnreadCount, (state, { count }) => ({ ...state, unreadCount: Math.max(0, count) })),
    on(notificationsActions.cacheRecent, (state, { rows }) => ({ ...state, recent: rows })),
    on(notificationsActions.cacheInboxPage, (state, { page }) => ({ ...state, inboxPage: page })),
    on(notificationsActions.markedRead, (state, { row }) => {
      const wasUnread =
        state.recent.some((r) => r.Id === row.Id && !r.IsRead) ||
        (state.inboxPage?.rows ?? []).some((r) => r.Id === row.Id && !r.IsRead);
      return {
        ...state,
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        recent: replaceRow(state.recent, row),
        inboxPage: state.inboxPage ? { ...state.inboxPage, rows: replaceRow(state.inboxPage.rows, row) } : null,
      };
    }),
    on(notificationsActions.markedAllRead, (state) => ({
      ...state,
      unreadCount: 0,
      recent: markAllRead(state.recent),
      inboxPage: state.inboxPage ? { ...state.inboxPage, rows: markAllRead(state.inboxPage.rows) } : null,
    })),
    on(notificationsActions.clearCache, () => ({ ...notificationsInitialState }))
  ),
});
