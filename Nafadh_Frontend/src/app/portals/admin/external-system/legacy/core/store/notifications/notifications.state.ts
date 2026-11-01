import type {
  CustomNotificationDto,
  CustomNotificationsPage,
  UserNotificationDto,
  UserNotificationsPage,
} from '../../api/models/custom-notifications.models';

export interface NotificationsState {
  /** Admin: last fetched page of custom notifications. */
  adminPage: CustomNotificationsPage | null;
  /** Admin: notification opened in the manage page. */
  adminSelected: CustomNotificationDto | null;
  /** Signed-in user: unread system notifications (header bell badge). */
  unreadCount: number;
  /** Signed-in user: latest inbox rows shown in the header bell dropdown. */
  recent: UserNotificationDto[];
  /** Signed-in user: last fetched page on the "My notifications" page. */
  inboxPage: UserNotificationsPage | null;
}

export const notificationsInitialState: NotificationsState = {
  adminPage: null,
  adminSelected: null,
  unreadCount: 0,
  recent: [],
  inboxPage: null,
};
