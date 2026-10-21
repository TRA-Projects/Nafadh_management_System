import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type {
  CustomNotificationDto,
  CustomNotificationsPage,
  UserNotificationDto,
  UserNotificationsPage,
} from '../../api/models/custom-notifications.models';

export const notificationsActions = createActionGroup({
  source: 'Notifications',
  events: {
    'Cache Admin Page': props<{ page: CustomNotificationsPage }>(),
    'Admin Notification Upserted': props<{ row: CustomNotificationDto }>(),
    'Cache Unread Count': props<{ count: number }>(),
    'Cache Recent': props<{ rows: UserNotificationDto[] }>(),
    'Cache Inbox Page': props<{ page: UserNotificationsPage }>(),
    'Marked Read': props<{ row: UserNotificationDto }>(),
    'Marked All Read': emptyProps(),
    'Clear Cache': emptyProps(),
  },
});
