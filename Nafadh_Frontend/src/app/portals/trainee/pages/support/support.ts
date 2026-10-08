import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  forkJoin,
  of
} from 'rxjs';

import {
  catchError
} from 'rxjs/operators';

import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  ConversationDetailDto,
  ConversationListItemDto,
  TraineeProfileDto,
  EnrollmentDto,
  TrainerDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainee-support',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './support.html'
})


export class TraineeSupport implements OnInit {


  // =========================================================
  // Conversations
  // =========================================================

  conversations =
    signal<ConversationListItemDto[]>([]);


  active =
    signal<ConversationDetailDto | null>(null);


  // =========================================================
  // Trainee
  // =========================================================

  traineeId =
    signal<number | null>(null);


  enrollment =
    signal<EnrollmentDto | null>(null);


  // =========================================================
  // Company
  // =========================================================

  companyName =
    signal('');


  // =========================================================
  // Trainers
  // =========================================================

  trainers =
    signal<TrainerDto[]>([]);


  loadingTrainers =
    signal(false);


  // =========================================================
  // UI
  // =========================================================

  isSubmitting =
    signal(false);


  errorMessage =
    signal('');


  successMessage =
    signal('');


  // =========================================================
  // Reply
  // =========================================================

  replyText = '';


  // =========================================================
  // New Request
  // =========================================================

  newConv = {

    receiverType: '',

    trainerId:
      null as number | null,

    subject: '',

    note: '',

    firstMessage: ''

  };


  // =========================================================
  // File
  // =========================================================

  selectedFile: File | null =
    null;


  // =========================================================
  // Authority Subjects
  // =========================================================

  subjects = [
    'استفسار عن البرنامج التدريبي',
    'مشكلة تقنية',
    'استفسار عن الحضور',
    'شكوى رسمية',
    'طلب انسحاب',
    'أخرى'
  ];


  // =========================================================
  // Constructor
  // =========================================================

  constructor(

    private api: TraineeApi,

    public auth: AuthService

  ) {}


  // =========================================================
  // Init
  // =========================================================

  ngOnInit(): void {

    this.loadConversations();

    this.loadCurrentTraineeData();

  }


  // =========================================================
  // Withdrawal Request
  // =========================================================

  isWithdrawalRequest(
    conversation: any
  ): boolean {

    if (!conversation) {

      return false;

    }


    return String(
      conversation?.subject ?? ''
    ).trim() === 'طلب انسحاب';

  }


  getWithdrawalStatus(
    conversation: any
  ): 'pending' | 'approved' | 'rejected' | null {

    if (
      !this.isWithdrawalRequest(
        conversation
      )
    ) {

      return null;

    }


    /*
     * الحالة الحالية مؤقتة إلى أن يتم
     * ربط حالة الطلب القادمة من Backend.
     *
     * حاليًا كل طلب انسحاب جديد يظهر
     * على أنه قيد المراجعة.
     */

    return 'pending';

  }


  // =========================================================
  // Trainee
  // =========================================================

  private loadCurrentTraineeData(): void {

    const uid =
      this.auth.userId;


    if (!uid) {

      return;

    }


    this.api
      .getTrainee(uid)
      .subscribe({

        next: (
          trainee: TraineeProfileDto
        ) => {

          const traineeId =
            Number(
              trainee.traineeId
            );


          if (
            !traineeId ||
            Number.isNaN(traineeId)
          ) {

            return;

          }


          this.traineeId.set(
            traineeId
          );


          this.loadTraineeEnrollment(
            traineeId
          );

        },


        error: (err) => {

          console.error(
            'Error loading trainee:',
            err
          );


          this.companyName.set('');

          this.trainers.set([]);

        }

      });

  }


  // =========================================================
  // Enrollment
  // =========================================================

  private loadTraineeEnrollment(
    traineeId: number
  ): void {

    this.api
      .getEnrollmentsByTrainee(
        traineeId
      )
      .subscribe({

        next: (
          enrollments: EnrollmentDto[]
        ) => {


          if (
            !enrollments ||
            enrollments.length === 0
          ) {

            this.enrollment.set(
              null
            );


            this.companyName.set('');

            this.trainers.set([]);

            return;

          }


          const activeEnrollment =

            enrollments.find(

              enrollment => {

                const status =
                  String(
                    enrollment.completionStatus
                    ?? ''
                  )
                    .toLowerCase();


                return (
                  status === 'active'
                  ||
                  status === 'inprogress'
                  ||
                  status === 'in_progress'
                );

              }

            )

            ||

            enrollments[0];


          this.enrollment.set(
            activeEnrollment
          );


          this.companyName.set(

            activeEnrollment.companyName

            ?? ''

          );


          const batchId =
            Number(
              activeEnrollment.batchId
            );


          if (
            batchId &&
            !Number.isNaN(batchId)
          ) {

            this.loadTrainersByBatch(
              batchId
            );

          }

          else {

            this.trainers.set([]);

          }

        },


        error: (err) => {

          console.error(
            'Error loading enrollment:',
            err
          );


          this.enrollment.set(
            null
          );


          this.companyName.set('');

          this.trainers.set([]);

        }

      });

  }


  // =========================================================
  // Trainers
  // =========================================================

  private loadTrainersByBatch(
    batchId: number
  ): void {

    this.loadingTrainers.set(
      true
    );


    this.trainers.set([]);


    this.api
      .getBatchTrainers(
        batchId
      )
      .subscribe({

        next: (
          batchTrainers: TrainerDto[]
        ) => {


          if (
            !batchTrainers ||
            batchTrainers.length === 0
          ) {

            this.trainers.set([]);

            this.loadingTrainers.set(
              false
            );

            return;

          }


          const requests =

            batchTrainers.map(

              batchTrainer => {

                const trainerId =
                  Number(
                    batchTrainer.trainerId
                  );


                if (
                  !trainerId ||
                  Number.isNaN(
                    trainerId
                  )
                ) {

                  return of(
                    batchTrainer
                  );

                }


                return this.api
                  .getTrainer(
                    trainerId
                  )
                  .pipe(

                    catchError(
                      () => {

                        return of(
                          batchTrainer
                        );

                      }
                    )

                  );

              }

            );


          forkJoin(
            requests
          )
            .subscribe({

              next: (
                fullTrainers
              ) => {

                const validTrainers =
                  fullTrainers.filter(
                    trainer =>
                      trainer != null
                  ) as TrainerDto[];


                this.trainers.set(
                  validTrainers
                );


                this.loadingTrainers.set(
                  false
                );

              },


              error: () => {

                this.trainers.set(
                  batchTrainers
                );


                this.loadingTrainers.set(
                  false
                );

              }

            });

        },


        error: (err) => {

          console.error(
            'Error loading trainers:',
            err
          );


          this.trainers.set([]);

          this.loadingTrainers.set(
            false
          );

        }

      });

  }


  // =========================================================
  // Conversations
  // =========================================================

  private loadConversations(): void {

    const uid =
      this.auth.userId;


    if (!uid) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );


      return;

    }


    this.api
      .getConversations(
        uid
      )
      .subscribe({

        next: (data) => {

          const all =
            data ?? [];


          const complaints =
            all.filter(

              (conversation: any) =>

                conversation.type ===
                  'TraineeComplaint'

                ||

                conversation.conversationType ===
                  'TraineeComplaint'

            );


          this.conversations.set(
            complaints
          );


          const current =
            this.active();


          if (current) {

            const exists =
              complaints.some(

                (conversation: any) =>

                  Number(
                    conversation.conversationId
                  )

                  ===

                  Number(
                    current.conversationId
                  )

              );


            if (!exists) {

              this.active.set(
                null
              );

            }

          }

        },


        error: (err) => {

          console.error(
            'Error loading conversations:',
            err
          );


          this.errorMessage.set(
            'تعذر تحميل الشكاوى'
          );

        }

      });

  }


  // =========================================================
  // Open Conversation
  // =========================================================

  open(
    id: number
  ): void {

    this.errorMessage.set('');


    const listConversation: any =

      this.conversations()

        .find(

          conversation =>

            Number(
              conversation.conversationId
            )

            ===

            Number(
              id
            )

        );


    this.api
      .getConversation(
        id
      )
      .subscribe({

        next: (
          conversation
        ) => {

          const mergedConversation: any = {

            ...(listConversation ?? {}),

            ...(conversation ?? {})

          };


          this.active.set(
            mergedConversation as ConversationDetailDto
          );

        },


        error: () => {

          this.errorMessage.set(
            'تعذر فتح المحادثة'
          );

        }

      });

  }


  // =========================================================
  // File
  // =========================================================

  onFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {

      return;

    }


    const file =
      input.files[0];


    const maxSize =
      10 * 1024 * 1024;


    if (
      file.size > maxSize
    ) {

      this.errorMessage.set(
        'حجم الملف يجب ألا يتجاوز 10MB'
      );


      this.selectedFile =
        null;


      input.value =
        '';


      return;

    }


    const allowedTypes = [

      'application/pdf',

      'image/png',

      'image/jpeg'

    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      this.errorMessage.set(
        'يسمح فقط بصورة PNG أو JPG أو JPEG أو ملف PDF'
      );


      this.selectedFile =
        null;


      input.value =
        '';


      return;

    }


    this.errorMessage.set('');

    this.selectedFile =
      file;

  }


  removeFile(
    event?: Event
  ): void {

    if (event) {

      event.stopPropagation();

    }


    this.selectedFile =
      null;

  }


  formatFileSize(
    bytes: number
  ): string {

    if (
      bytes === 0
    ) {

      return '0 KB';

    }


    const kb =
      bytes / 1024;


    if (
      kb < 1024
    ) {

      return `${kb.toFixed(1)} KB`;

    }


    const mb =
      kb / 1024;


    return `${mb.toFixed(2)} MB`;

  }


  // =========================================================
  // Receiver Change
  // =========================================================

  onReceiverChange(): void {

    this.newConv.subject =
      '';


    this.newConv.note =
      '';


    this.newConv.firstMessage =
      '';


    this.newConv.trainerId =
      null;


    this.selectedFile =
      null;


    this.errorMessage.set('');

  }


  // =========================================================
  // Selected Trainer
  // =========================================================

  private getSelectedTrainer():
    TrainerDto | undefined {

    const trainerId =
      this.newConv.trainerId;


    if (!trainerId) {

      return undefined;

    }


    return this.trainers()
      .find(

        trainer =>

          Number(
            trainer.trainerId
          )

          ===

          Number(
            trainerId
          )

      );

  }


  // =========================================================
  // Receiver Label
  // =========================================================

  getReceiverLabel(
    conversation: any
  ): string {

    if (!conversation) {

      return '';

    }


    const rawReceiverType =

      conversation?.receiverType

      ??

      conversation?.recipientType

      ??

      conversation?.targetType

      ??

      conversation?.assignedToType

      ??

      conversation?.receiverRole

      ??

      conversation?.recipientRole

      ??

      '';


    const receiverType =

      String(
        rawReceiverType
      )

        .trim()

        .toLowerCase();


    if (

      receiverType === 'authority'

      ||

      receiverType.includes('authority')

      ||

      receiverType.includes('هيئة')

    ) {

      return 'هيئة تنظيم الاتصالات';

    }


    if (

      receiverType === 'trainer'

      ||

      receiverType.includes('trainer')

      ||

      receiverType.includes('مدرب')

      ||

      conversation?.receiverTrainerId

      ||

      conversation?.trainerId

    ) {

      const trainerName =

        conversation?.receiverTrainerName

        ??

        conversation?.trainerName

        ??

        conversation?.recipientName

        ??

        conversation?.receiverName

        ??

        conversation?.targetName

        ??

        conversation?.assignedToName

        ??

        '';


      if (
        trainerName
      ) {

        return String(
          trainerName
        );

      }


      return 'المدرب';

    }


    if (

      receiverType === 'company'

      ||

      receiverType.includes('company')

      ||

      receiverType.includes('شركة')

      ||

      conversation?.receiverCompanyId

      ||

      conversation?.companyId

    ) {

      const conversationCompanyName =

        conversation?.receiverCompanyName

        ??

        conversation?.companyName

        ??

        conversation?.recipientName

        ??

        conversation?.receiverName

        ??

        conversation?.targetName

        ??

        conversation?.assignedToName

        ??

        this.companyName();


      if (
        conversationCompanyName
      ) {

        return `الشركة - ${conversationCompanyName}`;

      }


      return 'الشركة';

    }


    if (
      conversation?.receiverTrainerName
    ) {

      return String(
        conversation.receiverTrainerName
      );

    }


    if (
      conversation?.receiverCompanyName
    ) {

      return `الشركة - ${conversation.receiverCompanyName}`;

    }


    return '';

  }


  // =========================================================
  // Validate
  // =========================================================

  canSubmit(): boolean {

    if (
      !this.newConv.receiverType
    ) {

      return false;

    }


    if (
      this.newConv.receiverType ===
        'Trainer'
    ) {

      return (

        !!this.newConv.trainerId

        &&

        !!this.newConv.subject.trim()

        &&

        !!this.newConv.note.trim()

      );

    }


    if (
      this.newConv.receiverType ===
        'Company'
    ) {

      return (

        !!this.newConv.subject.trim()

        &&

        !!this.newConv.note.trim()

      );

    }


    if (
      this.newConv.receiverType ===
        'Authority'
    ) {

      return (

        !!this.newConv.subject.trim()

        &&

        !!this.newConv.firstMessage.trim()

      );

    }


    return false;

  }


  // =========================================================
  // Send Reply
  // =========================================================

  send(): void {

    const conversation =
      this.active();


    if (
      !conversation ||
      !this.replyText.trim()
    ) {

      return;

    }


    const uid =
      this.auth.userId;


    if (!uid) {

      return;

    }


    this.api
      .sendMessage(

        conversation.conversationId,

        {

          senderId:
            uid,

          content:
            this.replyText.trim()

        }

      )
      .subscribe({

        next: () => {

          this.replyText =
            '';


          this.open(
            conversation.conversationId
          );

        },


        error: () => {

          this.errorMessage.set(
            'تعذر إرسال الرد'
          );

        }

      });

  }


  // =========================================================
  // Start Conversation
  // =========================================================

  startConversation(): void {

    if (
      this.isSubmitting()
    ) {

      return;

    }


    this.errorMessage.set('');

    this.successMessage.set('');


    if (
      !this.newConv.receiverType
    ) {

      this.errorMessage.set(
        'يرجى اختيار الجهة المستلمة أولاً'
      );


      return;

    }


    if (

      this.newConv.receiverType ===
        'Trainer'

      &&

      !this.newConv.trainerId

    ) {

      this.errorMessage.set(
        'يرجى اختيار المدرب'
      );


      return;

    }


    if (
      !this.newConv.subject.trim()
    ) {

      this.errorMessage.set(
        'يرجى كتابة نوع الطلب'
      );


      return;

    }


    if (

      (

        this.newConv.receiverType ===
          'Trainer'

        ||

        this.newConv.receiverType ===
          'Company'

      )

      &&

      !this.newConv.note.trim()

    ) {

      this.errorMessage.set(
        'يرجى كتابة الملاحظة'
      );


      return;

    }


    if (

      this.newConv.receiverType ===
        'Authority'

      &&

      !this.newConv.firstMessage.trim()

    ) {

      this.errorMessage.set(
        'يرجى كتابة تفاصيل الطلب'
      );


      return;

    }


    const uid =
      this.auth.userId;


    if (!uid) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );


      return;

    }


    const selectedTrainer =
      this.getSelectedTrainer();


    const messageContent =

      this.newConv.receiverType ===
        'Trainer'

      ||

      this.newConv.receiverType ===
        'Company'

        ? this.newConv.note.trim()

        : this.newConv.firstMessage.trim();


    const payload = {

      type:
        'TraineeComplaint',

      receiverType:
        this.newConv.receiverType,

      receiverTrainerId:

        this.newConv.receiverType ===
          'Trainer'

          ? this.newConv.trainerId

          : null,

      receiverTrainerName:

        this.newConv.receiverType ===
          'Trainer'

          ? (
              selectedTrainer?.fullName
              ?? ''
            )

          : null,

      subject:
        this.newConv.subject.trim(),

      note:

        (

          this.newConv.receiverType ===
            'Trainer'

          ||

          this.newConv.receiverType ===
            'Company'

        )

          ? this.newConv.note.trim()

          : '',

      firstMessage:
        messageContent,

      startedByUserId:
        uid,

      attachment:
        this.selectedFile

    };


    console.log(
      'Sending support request:',
      payload
    );


    console.log(
      'Selected attachment:',
      this.selectedFile
    );


    this.isSubmitting.set(
      true
    );


    this.api
      .startConversation(
        payload
      )
      .subscribe({

        next: () => {

          this.successMessage.set(
            'تم إرسال الطلب بنجاح'
          );


          this.newConv = {

            receiverType:
              '',

            trainerId:
              null,

            subject:
              '',

            note:
              '',

            firstMessage:
              ''

          };


          this.selectedFile =
            null;


          this.loadConversations();


          this.isSubmitting.set(
            false
          );


          setTimeout(
            () => {

              this.successMessage.set(
                ''
              );

            },

            4000
          );

        },


        error: (err) => {

          console.error(
            'Error sending request:',
            err
          );


          let message =
            'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى';


          if (
            err?.error?.message
          ) {

            message =
              err.error.message;

          }


          this.errorMessage.set(
            message
          );


          this.isSubmitting.set(
            false
          );

        }

      });

  }

}