import type { UserNotificationDto } from '../../api/models/custom-notifications.models';
import { unreadBadgeText } from '../../../layout/main-layout/notifications-bell.component';
import { notificationsActions } from './notifications.actions';
import { notificationsFeature } from './notifications.reducer';
import { notificationsInitialState } from './notifications.state';

function row(id: number, isRead: boolean): UserNotificationDto {
  return { Id: id, Title: `T${id}`, Body: 'B', Locale: 'en', IsRead: isRead, CreatedAtUtc: '2026-10-05T10:00:00Z', ReadAtUtc: null };
}

describe('notifications store', () => {
  const reducer = notificationsFeature.reducer;

  it('marking an unread row read decrements the badge once and updates both lists', () => {
    let state = reducer(notificationsInitialState, notificationsActions.cacheUnreadCount({ count: 2 }));
    state = reducer(state, notificationsActions.cacheRecent({ rows: [row(1, false), row(2, false)] }));
    state = reducer(state, notificationsActions.cacheInboxPage({ page: { rows: [row(1, false)], total: 1, pageIndex: 0, pageSize: 5 } }));

    state = reducer(state, notificationsActions.markedRead({ row: row(1, true) }));
    expect(state.unreadCount).toBe(1);
    expect(state.recent[0].IsRead).toBeTrue();
    expect(state.inboxPage?.rows[0].IsRead).toBeTrue();

    state = reducer(state, notificationsActions.markedRead({ row: row(1, true) }));
    expect(state.unreadCount).toBe(1);
  });

  it('mark all read zeroes the badge and logout clears the cache', () => {
    let state = reducer(notificationsInitialState, notificationsActions.cacheUnreadCount({ count: 4 }));
    state = reducer(state, notificationsActions.cacheRecent({ rows: [row(1, false)] }));
    state = reducer(state, notificationsActions.markedAllRead());
    expect(state.unreadCount).toBe(0);
    expect(state.recent.every((r) => r.IsRead)).toBeTrue();

    state = reducer(state, notificationsActions.clearCache());
    expect(state).toEqual(notificationsInitialState);
  });

  it('bell badge is hidden at zero and capped at 99+', () => {
    expect(unreadBadgeText(0)).toBe('');
    expect(unreadBadgeText(7)).toBe('7');
    expect(unreadBadgeText(250)).toBe('99+');
  });
});
