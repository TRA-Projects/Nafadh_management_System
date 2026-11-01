import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, tap } from 'rxjs/operators';

import { unwrapData, type ApiData } from '../../profile/jobseeker-profile-api';
import { notificationsActions } from '../../store/notifications/notifications.actions';
import { ApiPaths } from '../api-paths';
import type {
  CustomNotificationDto,
  CustomNotificationRecipientPreviewDto,
  CustomNotificationsPage,
  CustomNotificationsQuery,
  CustomNotificationTargetDto,
  UpsertCustomNotificationRequestDto,
  UserNotificationDto,
  UserNotificationsPage,
  UserNotificationUnreadCountDto,
} from '../models/custom-notifications.models';

/** Bell dropdown shows this many latest inbox rows. */
export const RECENT_NOTIFICATIONS_LIMIT = 5;

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  // ---- Admin: custom notifications ----

  getAdminPage(query: CustomNotificationsQuery) {
    let params = new HttpParams().set('pageIndex', String(query.pageIndex)).set('pageSize', String(query.pageSize));
    const setIf = (key: string, value: string | undefined) => {
      if (value?.trim()) params = params.set(key, value.trim());
    };
    setIf('q', query.q);
    setIf('status', query.status);
    setIf('channel', query.channel);
    return this.http.get<ApiData<CustomNotificationsPage>>(ApiPaths.adminCustomNotifications, { params }).pipe(
      map(unwrapData),
      tap((page) => this.store.dispatch(notificationsActions.cacheAdminPage({ page })))
    );
  }

  getAdminNotification(id: number) {
    return this.http.get<ApiData<CustomNotificationDto>>(ApiPaths.adminCustomNotification(id)).pipe(
      map(unwrapData),
      tap((row) => this.store.dispatch(notificationsActions.adminNotificationUpserted({ row })))
    );
  }

  createAdminNotification(body: UpsertCustomNotificationRequestDto) {
    return this.http.post<ApiData<CustomNotificationDto>>(ApiPaths.adminCustomNotifications, body).pipe(
      map(unwrapData),
      tap((row) => this.store.dispatch(notificationsActions.adminNotificationUpserted({ row })))
    );
  }

  updateAdminNotification(id: number, body: UpsertCustomNotificationRequestDto) {
    return this.http.put<ApiData<CustomNotificationDto>>(ApiPaths.adminCustomNotification(id), body).pipe(
      map(unwrapData),
      tap((row) => this.store.dispatch(notificationsActions.adminNotificationUpserted({ row })))
    );
  }

  cancelAdminNotification(id: number) {
    return this.http.post<ApiData<CustomNotificationDto>>(ApiPaths.adminCustomNotificationCancel(id), {}).pipe(
      map(unwrapData),
      tap((row) => this.store.dispatch(notificationsActions.adminNotificationUpserted({ row })))
    );
  }

  previewRecipients(targets: CustomNotificationTargetDto[]) {
    return this.http
      .post<ApiData<CustomNotificationRecipientPreviewDto>>(ApiPaths.adminCustomNotificationsRecipientsPreview, targets)
      .pipe(map(unwrapData));
  }

  // ---- Signed-in user: inbox ----

  getUnreadCount() {
    return this.http.get<ApiData<UserNotificationUnreadCountDto>>(ApiPaths.myNotificationsUnreadCount).pipe(
      map(unwrapData),
      map((d) => d?.Count ?? 0),
      tap((count) => this.store.dispatch(notificationsActions.cacheUnreadCount({ count })))
    );
  }

  getRecent() {
    const params = new HttpParams().set('pageIndex', '0').set('pageSize', String(RECENT_NOTIFICATIONS_LIMIT));
    return this.http.get<ApiData<UserNotificationsPage>>(ApiPaths.myNotifications, { params }).pipe(
      map(unwrapData),
      map((page) => page?.rows ?? []),
      tap((rows) => this.store.dispatch(notificationsActions.cacheRecent({ rows })))
    );
  }

  getInboxPage(pageIndex: number, pageSize: number, unreadOnly = false) {
    let params = new HttpParams().set('pageIndex', String(pageIndex)).set('pageSize', String(pageSize));
    if (unreadOnly) params = params.set('unreadOnly', 'true');
    return this.http.get<ApiData<UserNotificationsPage>>(ApiPaths.myNotifications, { params }).pipe(
      map(unwrapData),
      tap((page) => this.store.dispatch(notificationsActions.cacheInboxPage({ page })))
    );
  }

  markRead(id: number) {
    return this.http.post<ApiData<UserNotificationDto>>(ApiPaths.myNotificationRead(id), {}).pipe(
      map(unwrapData),
      tap((row) => this.store.dispatch(notificationsActions.markedRead({ row })))
    );
  }

  markAllRead() {
    return this.http.post<ApiData<UserNotificationUnreadCountDto>>(ApiPaths.myNotificationsReadAll, {}).pipe(
      map(unwrapData),
      tap(() => this.store.dispatch(notificationsActions.markedAllRead()))
    );
  }
}
