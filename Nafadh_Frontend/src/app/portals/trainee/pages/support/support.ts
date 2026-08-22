import { Component, OnInit, signal } from '@angular/core';
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
  templateUrl: './support.html',
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

  showNew =
    signal(false);

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
  // New Conversation
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
      this.auth.userId ?? 4;

    this.api
      .getConversations(uid)
      .subscribe({

        next: (data) => {

          this.conversations.set(
            data ?? []
          );

        },

        error: (err) => {

          console.error(
            'خطأ في جلب المحادثات:',
            err
          );

        }

      });

  }


  // =========================================================
  // Open Conversation
  // =========================================================

  open(id: number): void {

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
            'خطأ في فتح المحادثة:',
            err
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


    // =======================================================
    // Max Size = 10 MB
    // =======================================================

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


    // =======================================================
    // Allowed Types
    // =======================================================

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
  // Validate Form
  // =========================================================

  canSubmit(): boolean {

    return (

      !!this.newConv.subject &&

      !!this.newConv.firstMessage &&

      this.newConv.firstMessage.trim().length > 0

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
      this.auth.userId ?? 4;


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
            'خطأ في إرسال الرد:',
            err
          );

        }

      });

  }


  // =========================================================
  // Start Conversation
  // =========================================================

  startConversation(): void {

    // ---------------------------------------------------------
    // Prevent double submit
    // ---------------------------------------------------------

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
    // User ID
    // ---------------------------------------------------------

    const uid =
      this.auth.userId ?? 4;


    // ---------------------------------------------------------
    // Request Body
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
      '📤 Sending conversation:',
      payload
    );


    // ---------------------------------------------------------
    // Loading
    // ---------------------------------------------------------

    this.isSubmitting.set(true);


    // ---------------------------------------------------------
    // API
    // ---------------------------------------------------------

    this.api
      .startConversation(payload)
      .subscribe({

        // =====================================================
        // SUCCESS
        // =====================================================

        next: (response) => {

          console.log(
            '✅ تم إرسال الطلب بنجاح:',
            response
          );


          this.successMessage.set(
            'تم إرسال الطلب بنجاح'
          );


          // ---------------------------------------------------
          // Reset Form
          // ---------------------------------------------------

          this.newConv = {

            subject: '',

            firstMessage: ''

          };


          this.selectedFile = null;


          // ---------------------------------------------------
          // Close New Form
          // ---------------------------------------------------

          this.showNew.set(false);


          // ---------------------------------------------------
          // Refresh Conversations
          // ---------------------------------------------------

          this.api
            .getConversations(uid)
            .subscribe({

              next: (data) => {

                this.conversations.set(
                  data ?? []
                );

              },

              error: (err) => {

                console.error(
                  'خطأ في تحديث المحادثات:',
                  err
                );

              }

            });


          // ---------------------------------------------------
          // Stop Loading
          // ---------------------------------------------------

          this.isSubmitting.set(false);


          // ---------------------------------------------------
          // Hide Success Message
          // ---------------------------------------------------

          setTimeout(() => {

            this.successMessage.set('');

          }, 4000);

        },


        // =====================================================
        // ERROR
        // =====================================================

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