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
  ConversationListItemDto
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


          /*
           * المتدرب يرى فقط شكاوى المتدربين.
           */

          const complaints =
            all.filter((c: any) =>

              c.type === 'TraineeComplaint' ||

              c.conversationType === 'TraineeComplaint'

            );


          console.log(
            '📋 Trainee complaints:',
            complaints
          );


          this.conversations.set(
            complaints
          );


          /*
           * إذا كانت هناك محادثة مفتوحة
           * نعيد تحميل تفاصيلها.
           */

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


    // ---------------------------------------------------------
    // Maximum 10 MB
    // ---------------------------------------------------------

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


    // ---------------------------------------------------------
    // Allowed types
    // ---------------------------------------------------------

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


    // ---------------------------------------------------------
    // Valid
    // ---------------------------------------------------------

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
  // Validate Form
  // =========================================================

  canSubmit(): boolean {

    return (

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


          /*
           * إعادة تحميل المحادثة
           * لإظهار الرسالة الجديدة.
           */

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


    // ---------------------------------------------------------
    // Clear messages
    // ---------------------------------------------------------

    this.errorMessage.set('');

    this.successMessage.set('');


    // ---------------------------------------------------------
    // Validate Subject
    // ---------------------------------------------------------

    if (!this.newConv.subject) {

      this.errorMessage.set(
        'يرجى اختيار موضوع الطلب'
      );

      return;

    }


    // ---------------------------------------------------------
    // Validate Message
    // ---------------------------------------------------------

    if (

      !this.newConv.firstMessage ||

      !this.newConv.firstMessage.trim()

    ) {

      this.errorMessage.set(
        'يرجى كتابة تفاصيل الطلب'
      );

      return;

    }


    // ---------------------------------------------------------
    // User
    // ---------------------------------------------------------

    const uid =
      this.auth.userId;


    if (!uid) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      return;

    }


    // ---------------------------------------------------------
    // Payload
    // ---------------------------------------------------------

    const payload = {

      type: 'TraineeComplaint',

      subject:
        this.newConv.subject,

      firstMessage:
        this.newConv.firstMessage.trim(),

      startedByUserId:
        uid

    };


    console.log(
      '📤 Sending trainee complaint:',
      payload
    );


    // ---------------------------------------------------------
    // Submit
    // ---------------------------------------------------------

    this.isSubmitting.set(true);


    this.api

      .startConversation(payload)

      .subscribe({

        next: (response) => {

          console.log(
            '✅ تم إرسال الشكوى:',
            response
          );


          // ---------------------------------------------------
          // Success
          // ---------------------------------------------------

          this.successMessage.set(
            'تم إرسال الطلب بنجاح'
          );


          // ---------------------------------------------------
          // Reset form
          // ---------------------------------------------------

          this.newConv = {

            subject: '',

            firstMessage: ''

          };


          this.selectedFile = null;


          // ---------------------------------------------------
          // Refresh conversations
          // ---------------------------------------------------

          this.loadConversations();


          // ---------------------------------------------------
          // Finish loading
          // ---------------------------------------------------

          this.isSubmitting.set(false);


          // ---------------------------------------------------
          // Hide success message
          // ---------------------------------------------------

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


          // ---------------------------------------------------
          // Backend object error
          // ---------------------------------------------------

          if (

            err?.error &&

            typeof err.error === 'object' &&

            err.error.message

          ) {

            message =
              err.error.message;

          }


          // ---------------------------------------------------
          // Backend string error
          // ---------------------------------------------------

          else if (

            err?.error &&

            typeof err.error === 'string'

          ) {

            message =
              err.error;

          }


          // ---------------------------------------------------
          // Angular error
          // ---------------------------------------------------

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