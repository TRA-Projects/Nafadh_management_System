import {
  ChangeDetectorRef,
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { TraineeApi } from '../../services/trainee-api';

import { AuthService } from '../../../../core/auth/auth.service';

import {
  NotificationDto,
  WarningDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainee-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',

  styles: [`

    :host {
      display: block;
      width: 100%;
    }

    .notifications-page {
      width: 100%;
      box-sizing: border-box;
      direction: rtl;
    }

    .notifications-top {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .notifications-page-title {
      margin: 0;
      color: #0b0d63;
      font-family: inherit;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.45;
    }

    .notification-filters {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-btn {
      height: 32px;
      min-width: 72px;
      padding: 0 17px;
      border: 0;
      outline: 0;
      border-radius: 8px;
      background: #f2f3f5;
      color: #7d8491;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition:
        background-color .15s ease,
        color .15s ease;
    }

    .filter-btn.active {
      background: #101262;
      color: #ffffff;
    }

    .notifications-list {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .notification-card {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #edf0f5;
      border-radius: 16px;
      box-shadow:
        0 3px 14px
        rgba(25, 45, 75, .045);
    }

    .notification-card.warning-card {
      border: 2px solid #ff4d52;
    }

    .status-corner {
      position: absolute;
      top: 0;
      left: 0;
      width: 12px;
      height: 12px;
      z-index: 30;
      pointer-events: none;
    }

    .status-unread {
      background: #ff4d52;
    }

    .status-read {
      background: #35cf97;
    }

    .notification-main {
      width: 100%;
      min-height: 89px;
      box-sizing: border-box;
      padding: 13px 14px 13px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      cursor: pointer;
      user-select: none;
    }

    .notification-main-content {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 13px;
    }

    .notification-icon {
      width: 42px;
      height: 42px;
      min-width: 42px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 11px;
    }

    .notification-svg {
      width: 24px;
      height: 24px;
      display: block;
    }

    .icon-attendance {
      background: #fff0f2;
    }

    .icon-warning {
      background: #feecee;
      color: #ff4d52;
    }

    .warning-svg {
      width: 25px;
      height: 25px;
    }

    .icon-announcement {
      background: #f5f1ff;
    }

    .icon-task {
      background: #eef6ff;
    }

    .icon-appointment {
      background: #fff6ea;
    }

    .icon-grade {
      background: #edf9f6;
    }

    .icon-conversation {
      background: #eef5ff;
    }

    .icon-project {
      background: #fff8e8;
    }

    .notification-text {
      flex: 1;
      min-width: 0;
      text-align: right;
    }

    .notification-category {
      margin-bottom: 2px;
      color: #9da6b6;
      font-family: inherit;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.3;
    }

    .notification-title {
      color: #273044;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.55;
      white-space: normal;
      word-break: break-word;
    }

    .notification-time {
      margin-top: 1px;
      color: #a7b0bf;
      font-family: inherit;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.3;
    }

    .warning-badge {
      width: fit-content;
      height: 20px;
      box-sizing: border-box;
      padding: 0 7px;
      margin-bottom: 3px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 10px;
      background: #feecee;
      color: #ef4444;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      line-height: 20px;
    }

    .warning-badge-dot {
      width: 6px;
      height: 6px;
      display: inline-block;
      border-radius: 50%;
      background: #ef4444;
    }

    .notification-arrow {
      width: 17px;
      height: 17px;
      flex-shrink: 0;
      color: #aab5c5;
      transform: rotate(0deg);
      transition: transform .2s ease;
    }

    .notification-arrow-open {
      transform: rotate(180deg);
    }

    .warning-arrow {
      color: #ff4d52;
    }

    .normal-details {
      width: 100%;
      box-sizing: border-box;
      padding: 17px 20px 14px;
      border-top: 1px solid #edf0f5;
      background: #ffffff;
      text-align: right;
    }

    .normal-details-text {
      margin: 0 20px 14px;
      color: #465166;
      font-family: inherit;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.9;
    }

    .normal-details-actions {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .normal-close-btn {
      min-width: 52px;
      height: 35px;
      padding: 0 14px;
      border: 1px solid #cfd6df;
      border-radius: 8px;
      background: #ffffff;
      color: #667085;
      font-family: inherit;
      font-size: 12px;
      font-weight: 400;
      cursor: pointer;
    }

    .normal-close-btn:hover {
      background: #f8fafc;
    }

    .warning-details {
      width: 100%;
      box-sizing: border-box;
      padding: 16px 18px;
      border-top: 1px solid #ffd6d8;
      background: #ffffff;
      text-align: right;
    }

    .warning-reason {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      margin-bottom: 12px;
      border-radius: 11px;
      background: #fff1f1;
    }

    .warning-section-title {
      margin-bottom: 6px;
      color: #d92f35;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
    }

    .warning-reason-text {
      color: #b72d32;
      font-family: inherit;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.7;
    }

    .warning-detail-section {
      box-sizing: border-box;
      padding: 0 4px;
      margin-bottom: 12px;
    }

    .warning-detail-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .warning-detail-list li {
      position: relative;
      padding-right: 16px;
      color: #667085;
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 400;
      line-height: 1.55;
    }

    .warning-detail-list li::before {
      content: '';
      position: absolute;
      top: 6px;
      right: 1px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ef4444;
    }

    .warning-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
    }

    .contact-supervisor-btn {
      min-height: 35px;
      padding: 7px 17px;
      border: 1px solid #ff474d;
      border-radius: 8px;
      background: #ff474d;
      color: #ffffff;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .contact-supervisor-btn:hover {
      background: #eb3f45;
    }

    .warning-close-btn {
      min-height: 35px;
      padding: 7px 16px;
      border: 1px solid #ff575d;
      border-radius: 8px;
      background: #ffffff;
      color: #e63d43;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .warning-close-btn:hover {
      background: #fff4f4;
    }

    .notifications-empty {
      min-height: 90px;
      border: 1px solid #edf0f5;
      border-radius: 16px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #98a2b3;
      font-family: inherit;
      font-size: 13px;
    }

    @media (max-width: 700px) {

      .notifications-top {
        margin-bottom: 15px;
      }

      .notifications-page-title {
        font-size: 17px;
      }

      .filter-btn {
        min-width: 65px;
        height: 30px;
        padding: 0 12px;
        font-size: 11px;
      }

      .notification-main {
        min-height: 82px;
        padding: 12px 11px 12px 15px;
      }

      .notification-main-content {
        gap: 10px;
      }

      .notification-icon {
        width: 40px;
        height: 40px;
        min-width: 40px;
      }

      .notification-title {
        font-size: 13px;
      }

      .normal-details-text {
        margin-right: 0;
        margin-left: 0;
      }

    }

  `]
})
export class TraineeNotifications implements OnInit {

  traineeId: number | null = null;

  enrollmentId: number | null = null;

  supervisorId: number | null = null;

  supervisorUserId: number | null = null;


  notifications =
    signal<NotificationDto[]>([]);


  warnings =
    signal<WarningDto[]>([]);


  filter =
    signal<'all' | 'unread'>('all');


  expandedId =
    signal<number | null>(null);


  locallyReadIds =
    signal<Set<number>>(
      new Set<number>()
    );


  constructor(
    private api: TraineeApi,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) { }


  ngOnInit(): void {

    const uid =
      this.auth.userId;


    if (
      uid === null ||
      uid === undefined
    ) {

      console.error(
        'No logged-in userId found.'
      );

      this.notifications.set([]);

      this.warnings.set([]);

      return;
    }


    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    this.api
      .getNotifications(uid)
      .subscribe({

        next: (data) => {

          this.notifications.set(
            data ?? []
          );

        },

        error: (error) => {

          console.error(
            'Error loading notifications:',
            error
          );

          this.notifications.set([]);

        }

      });


    // =====================================================
    // USER ID -> TRAINEE
    // =====================================================

    this.api
      .getTraineeByUserId(uid)
      .subscribe({

        next: (trainee) => {

          if (
            !trainee ||
            trainee.traineeId === null ||
            trainee.traineeId === undefined
          ) {

            console.error(
              'Trainee profile does not contain traineeId.'
            );

            return;
          }


          this.traineeId =
            trainee.traineeId;


          // =================================================
          // TRAINEE -> ENROLLMENT
          // =================================================

          this.api
            .getEnrollmentsByTrainee(
              trainee.traineeId
            )
            .subscribe({

              next: (data) => {

                const enrollments =
                  data ?? [];


                const enrollment =
                  enrollments.find(
                    (item: any) =>
                      item?.completionStatus ===
                      'InProgress'
                  ) ??
                  enrollments[0];


                if (
                  !enrollment
                ) {

                  console.error(
                    'No enrollment found.'
                  );

                  return;
                }


                this.enrollmentId =
                  Number(
                    enrollment.enrollmentId
                  );


                this.supervisorId =
                  enrollment.supervisorId ??
                  null;


                // =============================================
                // WARNINGS
                // =============================================

                if (
                  this.enrollmentId !== null &&
                  Number.isFinite(
                    this.enrollmentId
                  )
                ) {

                  this.api
                    .getMyWarnings(
                      this.enrollmentId
                    )
                    .subscribe({

                      next: (warnings) => {

                        this.warnings.set(
                          warnings ?? []
                        );

                      },

                      error: (error) => {

                        console.error(
                          'Error loading warnings:',
                          error
                        );

                        this.warnings.set([]);

                      }

                    });

                }


                // =============================================
                // SUPERVISOR ID -> USER ID
                // =============================================

                if (
                  this.supervisorId !== null
                ) {

                  this.api
                    .getCompanySupervisor(
                      this.supervisorId
                    )
                    .subscribe({

                      next: (supervisor) => {

                        const supervisorUserId =
                          Number(
                            supervisor?.userId
                          );


                        if (
                          Number.isFinite(
                            supervisorUserId
                          )
                        ) {

                          this.supervisorUserId =
                            supervisorUserId;

                        }

                      },

                      error: (error) => {

                        console.error(
                          'Error loading supervisor:',
                          error
                        );

                        this.supervisorUserId =
                          null;

                      }

                    });

                }

              },

              error: (error) => {

                console.error(
                  'Error loading enrollments:',
                  error
                );

              }

            });

        },

        error: (error) => {

          console.error(
            'Error loading trainee:',
            error
          );

        }

      });

  }


  // =====================================================
  // FILTER
  // =====================================================

  setFilter(
    value: 'all' | 'unread'
  ): void {

    this.filter.set(value);

    this.expandedId.set(null);

  }


  filtered(): NotificationDto[] {

    const unique =
      this.removeDuplicates(
        this.notifications()
      );


    if (
      this.filter() === 'unread'
    ) {

      return unique.filter(
        item =>
          !this.isNotificationRead(
            item
          )
      );

    }


    return unique;

  }


  // =====================================================
  // REMOVE DUPLICATES
  // =====================================================

  private removeDuplicates(
    list: NotificationDto[]
  ): NotificationDto[] {

    const sorted =
      [...list].sort(
        (a, b) => {

          const aDate =
            new Date(
              a.createdAt as any
            ).getTime();


          const bDate =
            new Date(
              b.createdAt as any
            ).getTime();


          return bDate - aDate;

        }
      );


    const seen =
      new Set<string>();


    const result:
      NotificationDto[] = [];


    for (
      const notification
      of sorted
    ) {

      const key =
        [
          this.normalizeText(
            notification.relatedEntity
          ),

          this.normalizeText(
            notification.title
          ),

          this.normalizeText(
            notification.message
          )
        ]
          .join('|');


      if (
        seen.has(key)
      ) {

        continue;

      }


      seen.add(key);

      result.push(
        notification
      );

    }


    return result;

  }


  private normalizeText(
    value: unknown
  ): string {

    return String(
      value ?? ''
    )
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/ـ/g, '')
      .toLowerCase();

  }


  // =====================================================
  // WARNING
  // =====================================================

  isWarning(
    notification: NotificationDto
  ): boolean {

    return (
      notification.relatedEntity === 'Warning' ||
      notification.relatedEntity === 'Alert'
    );

  }


  // =====================================================
  // ICON
  // =====================================================

  getIconClass(
    entity:
      | string
      | null
      | undefined
  ): string {

    switch (entity) {

      case 'Attendance':
        return 'icon-attendance';

      case 'Warning':
      case 'Alert':
        return 'icon-warning';

      case 'Announcement':
        return 'icon-announcement';

      case 'Task':
        return 'icon-task';

      case 'Appointment':
        return 'icon-appointment';

      case 'Grade':
      case 'Evaluation':
        return 'icon-grade';

      case 'Conversation':
        return 'icon-conversation';

      case 'Project':
        return 'icon-project';

      default:
        return 'icon-project';

    }

  }


  // =====================================================
  // CATEGORY
  // =====================================================

  getCategoryLabel(
    entity:
      | string
      | null
      | undefined
  ): string {

    switch (entity) {

      case 'Attendance':
        return 'غياب';

      case 'Warning':
      case 'Alert':
        return 'إنذار';

      case 'Announcement':
        return 'عام';

      case 'Task':
        return 'مهمة';

      case 'Appointment':
        return 'موعد';

      case 'Grade':
      case 'Evaluation':
        return 'درجة';

      case 'Conversation':
        return 'محادثة';

      case 'Project':
        return 'مشروع';

      default:
        return 'إشعار';

    }

  }


  // =====================================================
  // READ STATUS
  // =====================================================

  isNotificationRead(
    notification: NotificationDto
  ): boolean {

    return (
      notification.isRead === true ||
      this.locallyReadIds().has(
        notification.notificationId
      )
    );

  }


  // =====================================================
  // OPEN / CLOSE
  // =====================================================

  toggleCard(
    notification: NotificationDto
  ): void {

    const id =
      notification.notificationId;


    if (
      this.expandedId() === id
    ) {

      this.expandedId.set(null);

      return;

    }


    this.expandedId.set(id);


    if (
      !this.isNotificationRead(
        notification
      )
    ) {

      this.markRead(
        notification
      );

    }

  }


  closeCard(
    notification: NotificationDto
  ): void {

    this.expandedId.set(null);

  }


  // =====================================================
  // MARK READ
  // =====================================================

  private markRead(
    notification: NotificationDto
  ): void {

    if (
      this.isNotificationRead(
        notification
      )
    ) {

      return;

    }


    const notificationId =
      notification.notificationId;


    const updatedIds =
      new Set<number>(
        this.locallyReadIds()
      );


    updatedIds.add(
      notificationId
    );


    this.locallyReadIds.set(
      updatedIds
    );


    notification.isRead = true;


    this.notifications.update(
      list =>
        list.map(
          item => {

            if (
              item.notificationId ===
              notificationId
            ) {

              return {
                ...item,
                isRead: true
              };

            }

            return item;

          }
        )
    );


    this.cdr.detectChanges();


    this.api
      .markRead(
        notificationId
      )
      .subscribe({

        next: () => {

          console.log(
            'Notification marked as read:',
            notificationId
          );

        },


        error: (error: any) => {

          /*
            بعض Backends ترجع 200 مع نص،
            وAngular قد يعتبر الرد خطأ parsing
            رغم أن العملية تمت بنجاح.
          */
          if (
            error?.status === 200
          ) {

            console.log(
              'Notification marked as read successfully:',
              notificationId
            );

            return;

          }


          console.error(
            'Error marking notification as read:',
            error
          );


          notification.isRead = false;


          const rollbackIds =
            new Set<number>(
              this.locallyReadIds()
            );


          rollbackIds.delete(
            notificationId
          );


          this.locallyReadIds.set(
            rollbackIds
          );


          this.notifications.update(
            list =>
              list.map(
                item => {

                  if (
                    item.notificationId ===
                    notificationId
                  ) {

                    return {
                      ...item,
                      isRead: false
                    };

                  }

                  return item;

                }
              )
          );


          this.cdr.detectChanges();

        }

      });

  }


  // =====================================================
  // WARNING OBJECT
  // =====================================================

  private getWarningObject(
    notification: NotificationDto
  ): any | null {

    const warningList =
      this.warnings() as any[];


    if (
      warningList.length === 0
    ) {

      return null;

    }


    const n =
      notification as any;


    const relatedId =
      n.relatedEntityId;


    if (
      relatedId !== null &&
      relatedId !== undefined
    ) {

      const idMatch =
        warningList.find(
          warning =>
            warning.warningId === relatedId ||
            warning.id === relatedId ||
            warning.notificationId ===
              notification.notificationId
        );


      if (
        idMatch
      ) {

        return idMatch;

      }

    }


    const notificationTitle =
      this.normalizeText(
        notification.title
      );


    const titleMatch =
      warningList.find(
        warning => {

          const warningTitle =
            this.normalizeText(
              warning.title ??
              warning.warningTitle ??
              ''
            );


          if (
            !warningTitle ||
            !notificationTitle
          ) {

            return false;

          }


          return (
            warningTitle.includes(
              notificationTitle
            ) ||
            notificationTitle.includes(
              warningTitle
            )
          );

        }
      );


    return titleMatch ?? null;

  }


  // =====================================================
  // WARNING REASON
  // داتا حقيقية فقط
  // =====================================================

  getWarningReason(
    notification: NotificationDto
  ): string {

    const warning =
      this.getWarningObject(
        notification
      );


    const reason =
      warning?.reason ??
      warning?.warningReason ??
      warning?.reasonText ??
      warning?.description;


    if (
      reason &&
      String(reason).trim()
    ) {

      return String(
        reason
      ).trim();

    }


    /*
      إذا لم يوجد Warning منفصل في Backend
      نستخدم Message الخاصة بالـ Notification نفسها.
      هذه داتا حقيقية وليست نصاً وهمياً.
    */
    if (
      notification.message &&
      String(
        notification.message
      ).trim()
    ) {

      return String(
        notification.message
      ).trim();

    }


    return 'لم يتم توفير سبب إضافي لهذا الإنذار.';

  }


  // =====================================================
  // WARNING DETAILS
  // داتا حقيقية فقط
  // =====================================================

  getWarningDetails(
    notification: NotificationDto
  ): string[] {

    const warning =
      this.getWarningObject(
        notification
      );


    /*
      إذا لا يوجد Warning في Backend،
      لا نعرض تفاصيل وهمية.
    */
    if (
      !warning
    ) {

      return [];

    }


    const rawDetails =
      warning?.details ??
      warning?.warningDetails ??
      warning?.items;


    if (
      Array.isArray(
        rawDetails
      )
    ) {

      const values =
        rawDetails
          .map(
            (item: any) => {

              if (
                typeof item === 'string'
              ) {

                return item.trim();

              }


              return String(
                item?.text ??
                item?.description ??
                item?.message ??
                ''
              ).trim();

            }
          )
          .filter(Boolean);


      if (
        values.length > 0
      ) {

        return values;

      }

    }


    const details:
      string[] = [];


    const absenceDays =
      warning?.absenceDays ??
      warning?.daysAbsent ??
      warning?.absentDays;


    const missedTasks =
      warning?.missedTasks ??
      warning?.missedDeadlines ??
      warning?.lateTasks;


    const commitment =
      warning?.commitmentPercentage ??
      warning?.attendancePercentage ??
      warning?.percentage ??
      warning?.rate;


    const minimum =
      warning?.minimumPercentage ??
      warning?.minimumRequired ??
      warning?.requiredPercentage;


    if (
      absenceDays !== null &&
      absenceDays !== undefined
    ) {

      details.push(
        `غياب غير مبرر: ${absenceDays} أيام`
      );

    }


    if (
      missedTasks !== null &&
      missedTasks !== undefined
    ) {

      details.push(
        `مهام متأخرة: ${missedTasks}`
      );

    }


    if (
      commitment !== null &&
      commitment !== undefined
    ) {

      if (
        minimum !== null &&
        minimum !== undefined
      ) {

        details.push(
          `نسبة الالتزام الحالية: ${commitment}% (الحد الأدنى المطلوب: ${minimum}%)`
        );

      }

      else {

        details.push(
          `نسبة الالتزام الحالية: ${commitment}%`
        );

      }

    }


    return details;

  }


  // =====================================================
  // HAS REAL WARNING DETAILS
  // =====================================================

  hasWarningDetails(
    notification: NotificationDto
  ): boolean {

    return (
      this.getWarningDetails(
        notification
      ).length > 0
    );

  }


  // =====================================================
  // CONTACT SUPERVISOR
  // =====================================================

  contactTrainer(
    notification: NotificationDto
  ): void {

    const senderId =
      this.auth.userId;


    if (
      senderId === null ||
      senderId === undefined
    ) {

      window.alert(
        'تعذر تحديد حساب المتدرب.'
      );

      return;

    }


    if (
      this.supervisorUserId === null
    ) {

      window.alert(
        'تعذر تحديد حساب المشرف حالياً.'
      );

      return;

    }


    const defaultMessage =
      `السلام عليكم، أود الاستفسار بخصوص الإنذار: ${notification.title ?? ''}`;


    const message =
      window.prompt(
        'اكتب رسالتك للمشرف:',
        defaultMessage
      );


    if (
      message === null ||
      !message.trim()
    ) {

      return;

    }


    this.api
      .sendDirectMessage(
        senderId,
        this.supervisorUserId,
        message.trim()
      )
      .subscribe({

        next: () => {

          window.alert(
            'تم إرسال رسالتك إلى المشرف بنجاح.'
          );

        },


        error: (error) => {

          console.error(
            'Error sending direct message:',
            error
          );


          window.alert(
            'تعذر إرسال الرسالة. حاول مرة أخرى.'
          );

        }

      });

  }


  // =====================================================
  // RELATIVE TIME
  // =====================================================

  getRelativeTime(
    dateValue: unknown
  ): string {

    if (
      !dateValue
    ) {

      return '';

    }


    const date =
      new Date(
        dateValue as any
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '';

    }


    const now =
      new Date();


    const diff =
      now.getTime() -
      date.getTime();


    if (
      diff <= 0
    ) {

      return 'الآن';

    }


    const minutes =
      Math.floor(
        diff / 60000
      );


    const hours =
      Math.floor(
        diff / 3600000
      );


    const days =
      Math.floor(
        diff / 86400000
      );


    const weeks =
      Math.floor(
        days / 7
      );


    const months =
      Math.floor(
        days / 30
      );


    if (
      minutes < 1
    ) {

      return 'الآن';

    }


    if (
      minutes === 1
    ) {

      return 'منذ دقيقة';

    }


    if (
      minutes === 2
    ) {

      return 'منذ دقيقتين';

    }


    if (
      minutes >= 3 &&
      minutes <= 10
    ) {

      return `منذ ${minutes} دقائق`;

    }


    if (
      minutes < 60
    ) {

      return `منذ ${minutes} دقيقة`;

    }


    if (
      hours === 1
    ) {

      return 'منذ ساعة';

    }


    if (
      hours === 2
    ) {

      return 'منذ ساعتين';

    }


    if (
      hours >= 3 &&
      hours <= 10
    ) {

      return `منذ ${hours} ساعات`;

    }


    if (
      hours < 24
    ) {

      return `منذ ${hours} ساعة`;

    }


    if (
      days === 1
    ) {

      return 'منذ يوم';

    }


    if (
      days === 2
    ) {

      return 'منذ يومين';

    }


    if (
      days >= 3 &&
      days <= 10
    ) {

      return `منذ ${days} أيام`;

    }


    if (
      days < 14
    ) {

      return `منذ ${days} يوم`;

    }


    if (
      weeks === 1
    ) {

      return 'منذ أسبوع';

    }


    if (
      weeks === 2
    ) {

      return 'منذ أسبوعين';

    }


    if (
      weeks >= 3 &&
      weeks <= 4
    ) {

      return `منذ ${weeks} أسابيع`;

    }


    if (
      months === 1
    ) {

      return 'منذ شهر';

    }


    if (
      months === 2
    ) {

      return 'منذ شهرين';

    }


    if (
      months >= 3 &&
      months <= 10
    ) {

      return `منذ ${months} أشهر`;

    }


    return `منذ ${months} شهر`;

  }

}