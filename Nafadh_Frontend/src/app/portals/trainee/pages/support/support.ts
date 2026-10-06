import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TraineeApi } from '../../services/trainee-api';

import { AuthService } from '../../../../core/auth/auth.service';

import {
  ConversationDetailDto,
  ConversationListItemDto,
  TraineeProfileDto,
  EnrollmentDto
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
  // Trainee Company
  // =========================================================

  traineeId =
    signal<number | null>(null);

  enrollment =
    signal<EnrollmentDto | null>(null);

  companyName =
    signal('');


  // =========================================================
  // UI State
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
  // New Complaint
  // =========================================================

  newConv = {

    receiverType: '',

    subject: '',

    firstMessage: ''

  };


  // =========================================================
  // File
  // =========================================================

  selectedFile: File | null = null;


  // =========================================================
  // Subjects
  // =========================================================

  subjects = [

    'استفسار عن البرنامج التدريبي',

    'مشكلة تقنية',

    'استفسار عن الحضور',

    'شكوى رسمية',

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
  // On Init
  // =========================================================

  ngOnInit(): void {

    this.loadConversations();

    this.loadCurrentTraineeCompany();

  }


  // =========================================================
  // Load Current Trainee Company
  // =========================================================

  private loadCurrentTraineeCompany(): void {

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

            console.error(
              '❌ Invalid traineeId:',
              trainee
            );

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
            '❌ خطأ في جلب بيانات المتدرب:',
            err
          );

          this.companyName.set('');

        }

      });

  }


  // =========================================================
  // Load Trainee Enrollment
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

            this.enrollment.set(null);

            this.companyName.set('');

            return;

          }


          const activeEnrollment =

            enrollments.find(

              e => {

                const status =

                  String(
                    e.completionStatus ?? ''
                  ).toLowerCase();


                return (

                  status === 'active' ||

                  status === 'inprogress'

                );

              }

            )

            ||

            enrollments[0];


          this.enrollment.set(
            activeEnrollment
          );


          this.companyName.set(

            activeEnrollment.companyName ?? ''

          );

        },


        error: (err) => {

          console.error(
            '❌ خطأ في جلب تسجيل المتدرب:',
            err
          );


          this.enrollment.set(null);

          this.companyName.set('');

        }

      });

  }


  // =========================================================
  // Load Conversations
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
      .getConversations(uid)

      .subscribe({

        next: (data) => {

          const all =
            data ?? [];


          console.log(
            '📥 All conversations:',
            all
          );


          const complaints =

            all.filter((c: any) =>

              c.type === 'TraineeComplaint' ||

              c.conversationType ===
                'TraineeComplaint'

            );


          console.log(
            '📋 Trainee complaints:',
            complaints
          );


          this.conversations.set(
            complaints
          );


          const current =
            this.active();


          if (current) {

            const stillExists =

              complaints.some(

                (c: any) =>

                  c.conversationId ===
                  current.conversationId

              );


            if (!stillExists) {

              this.active.set(null);

            }

          }

        },


        error: (err) => {

          console.error(
            '❌ خطأ في جلب الشكاوى:',
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

  open(id: number): void {

    this.errorMessage.set('');


    this.api
      .getConversation(id)

      .subscribe({

        next: (conversation) => {

          this.active.set(
            conversation
          );

        },


        error: (err) => {

          console.error(
            '❌ خطأ في فتح المحادثة:',
            err
          );


          this.errorMessage.set(
            'تعذر فتح المحادثة'
          );

        }

      });

  }


  // =========================================================
  // File Selected
  // =========================================================

  onFileSelected(event: Event): void {

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


    if (file.size > maxSize) {

      this.errorMessage.set(
        'حجم الملف يجب ألا يتجاوز 10MB'
      );


      this.selectedFile = null;

      input.value = '';


      return;

    }


    const allowedTypes = [

      'application/pdf',

      'image/png',

      'image/jpeg'

    ];


    if (
      !allowedTypes.includes(file.type)
    ) {

      this.errorMessage.set(
        'نوع الملف غير مدعوم. يسمح فقط بـ PDF, PNG, JPG'
      );


      this.selectedFile = null;

      input.value = '';


      return;

    }


    this.errorMessage.set('');

    this.selectedFile = file;

  }


  // =========================================================
  // Remove File
  // =========================================================

  removeFile(event?: Event): void {

    if (event) {

      event.stopPropagation();

    }


    this.selectedFile = null;

  }


  // =========================================================
  // Format File Size
  // =========================================================

  formatFileSize(bytes: number): string {

    if (bytes === 0) {

      return '0 KB';

    }


    const kb =
      bytes / 1024;


    if (kb < 1024) {

      return `${kb.toFixed(1)} KB`;

    }


    const mb =
      kb / 1024;


    return `${mb.toFixed(2)} MB`;

  }


  // =========================================================
  // Receiver
  // =========================================================

  onReceiverChange(): void {

    this.newConv.subject = '';

    this.errorMessage.set('');

  }


  getReceiverLabel(
    conversation: any
  ): string {

    const receiverType =

      conversation?.receiverType ??

      conversation?.recipientType ??

      conversation?.targetType ??

      conversation?.assignedToType ??

      conversation?.receiverRole ??

      conversation?.recipientRole ??

      '';


    switch (receiverType) {

      case 'Authority':

      case 'authority':

      case ' الهيئة':

        return 'هيئة تنظيم الاتصالات';


      case 'Trainer':

      case 'trainer':

        return 'المدرب';


      case 'Company':

      case 'company':

        return (
          this.companyName() ||
          'الشركة'
        );


      default:

        return 'الجهة المختصة';

    }

  }


  // =========================================================
  // Validate Form
  // =========================================================

  canSubmit(): boolean {

    return (

      !!this.newConv.receiverType &&

      !!this.newConv.subject &&

      !!this.newConv.firstMessage &&

      this.newConv.firstMessage
        .trim()
        .length > 0

    );

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

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      return;

    }


    this.errorMessage.set('');


    this.api
      .sendMessage(

        conversation.conversationId,

        {

          senderId: uid,

          content:
            this.replyText.trim()

        }

      )

      .subscribe({

        next: () => {

          this.replyText = '';


          this.open(
            conversation.conversationId
          );

        },


        error: (err) => {

          console.error(
            '❌ خطأ في إرسال الرد:',
            err
          );


          this.errorMessage.set(
            'تعذر إرسال الرد'
          );

        }

      });

  }


  // =========================================================
  // Start Complaint
  // =========================================================

  startConversation(): void {

    if (this.isSubmitting()) {

      return;

    }


    this.errorMessage.set('');

    this.successMessage.set('');


    // Validate Receiver

    if (!this.newConv.receiverType) {

      this.errorMessage.set(
        'يرجى اختيار الجهة المستلمة'
      );

      return;

    }


    // Validate Subject

    if (!this.newConv.subject) {

      this.errorMessage.set(
        'يرجى اختيار موضوع الطلب'
      );

      return;

    }


    // Validate Message

    if (
      !this.newConv.firstMessage ||
      !this.newConv.firstMessage.trim()
    ) {

      this.errorMessage.set(
        'يرجى كتابة تفاصيل الطلب'
      );

      return;

    }


    // User

    const uid =
      this.auth.userId;


    if (!uid) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      return;

    }


    // Payload

    const payload = {

      type: 'TraineeComplaint',

      receiverType:
        this.newConv.receiverType,

      subject:
        this.newConv.subject,

      firstMessage:
        this.newConv.firstMessage.trim(),

      startedByUserId:
        uid

    };


    console.log(
      '📤 Sending trainee support request:',
      payload
    );


    this.isSubmitting.set(true);


    this.api
      .startConversation(payload)

      .subscribe({

        next: (response) => {

          console.log(
            '✅ تم إرسال الطلب:',
            response
          );


          this.successMessage.set(
            'تم إرسال الطلب بنجاح'
          );


          this.newConv = {

            receiverType: '',

            subject: '',

            firstMessage: ''

          };


          this.selectedFile = null;


          this.loadConversations();


          this.isSubmitting.set(false);


          setTimeout(() => {

            this.successMessage.set('');

          }, 4000);

        },


        error: (err) => {

          console.error(
            '❌ خطأ في إرسال الطلب:',
            err
          );


          let message =

            'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى';


          if (

            err?.error &&

            typeof err.error === 'object' &&

            err.error.message

          ) {

            message =
              err.error.message;

          }

          else if (

            err?.error &&

            typeof err.error === 'string'

          ) {

            message =
              err.error;

          }

          else if (err?.message) {

            message =
              err.message;

          }


          this.errorMessage.set(
            message
          );


          this.isSubmitting.set(false);

        }

      });

  }

}