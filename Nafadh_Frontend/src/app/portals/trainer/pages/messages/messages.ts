import { Component, computed, signal } from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

@Component({
  selector: 'app-trainer-messages',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './messages.html',

  styleUrl: './messages.scss'
})
export class TrainerMessages {

  // =====================================================
  // SEARCH
  // =====================================================

  searchText = '';
  unreadOnly = false;
  todayDate = new Intl.DateTimeFormat('ar-OM', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(new Date());
get filteredTrainees() {
  const search = this.searchText.trim().toLowerCase();

  return this.trainees.filter((trainee) => {

    const matchesSearch =
      !search ||
      trainee.name.toLowerCase().includes(search) ||
      trainee.batchName.toLowerCase().includes(search) ||
      trainee.lastMessage.toLowerCase().includes(search);

    const matchesUnread =
      !this.unreadOnly || trainee.unread;

    return matchesSearch && matchesUnread;
  });
}

  // =====================================================
  // SELECTED TRAINEE
  // =====================================================

  selectedTraineeId =
    signal<number | null>(null);

  // =====================================================
  // MESSAGE
  // =====================================================

  messageText = '';

  // =====================================================
  // TEMPORARY TRAINEES
  // =====================================================
  // سنربطهم بالـ Backend لاحقًا

  trainees = [
    {
      traineeId: 1,
      name: 'أحمد محمد الزدجالي',
      batchName: 'الدفعة الأولى',
      lastMessage: 'عندي استفسار عن موعد التقييم',
      time: '10:42 ص',
      unread: true,
      online: true
    },

    {
      traineeId: 2,
      name: 'سعيد الجابري',
      batchName: 'الدفعة الأولى',
      lastMessage: 'شكرًا أستاذ',
      time: '9:15 ص',
      unread: false,
      online: false
    },

    {
      traineeId: 3,
      name: 'إباء العامري',
      batchName: 'الدفعة الثانية',
      lastMessage: 'أرسلت لك المشروع',
      time: 'أمس',
      unread: true,
      online: true
    },

    {
      traineeId: 4,
      name: 'سلوى الهنائي',
      batchName: 'الدفعة الثانية',
      lastMessage: 'متى تظهر نتيجة التقييم؟',
      time: 'الأحد',
      unread: false,
      online: false
    },

    {
      traineeId: 5,
      name: 'راشد الزدجالي',
      batchName: 'الدفعة الثالثة',
      lastMessage: 'حسنًا سأقوم بالتعديل',
      time: 'السبت',
      unread: false,
      online: false
    },

    {
      traineeId: 6,
      name: 'أسماء العوفي',
      batchName: 'الدفعة الثالثة',
      lastMessage: 'تم استلام الرسالة',
      time: 'السبت',
      unread: false,
      online: false
    }
  ];

  // =====================================================
  // CURRENT CONVERSATION
  // =====================================================
messagesByTrainee: Record<number, {
  sender: 'trainee' | 'trainer';
  text: string;
  time: string;
}[]> = {

  1: [
    {
      sender: 'trainee',
      text: 'السلام عليكم أستاذ، عندي استفسار عن موعد التقييم القادم.',
      time: '10:38 ص'
    },
    {
      sender: 'trainer',
      text: 'وعليكم السلام أحمد، يمكنك مراجعة المهام المطلوبة من صفحة التقييمات.',
      time: '10:40 ص'
    },
    {
      sender: 'trainee',
      text: 'تمام، وهل أحتاج إلى تسليم ملف المشروع قبل موعد التقييم؟',
      time: '10:41 ص'
    },
    {
      sender: 'trainer',
      text: 'نعم، يفضل تسليمه قبل الموعد حتى أتمكن من مراجعته وإضافة الملاحظات.',
      time: '10:42 ص'
    }
  ],

  2: [
    {
      sender: 'trainee',
      text: 'السلام عليكم أستاذ، هل تم اعتماد المهمة الأخيرة؟',
      time: '9:10 ص'
    },
    {
      sender: 'trainer',
      text: 'وعليكم السلام سعيد، نعم تم اعتمادها.',
      time: '9:13 ص'
    },
    {
      sender: 'trainee',
      text: 'شكرًا أستاذ.',
      time: '9:15 ص'
    }
  ],

  3: [
    {
      sender: 'trainee',
      text: 'السلام عليكم، أرسلت لك المشروع بعد التعديل.',
      time: '10:05 ص'
    },
    {
      sender: 'trainer',
      text: 'وعليكم السلام إباء، وصلتني النسخة الجديدة وسأراجعها.',
      time: '10:12 ص'
    }
  ],

  4: [
    {
      sender: 'trainee',
      text: 'السلام عليكم، متى تظهر نتيجة التقييم؟',
      time: '11:20 ص'
    },
    {
      sender: 'trainer',
      text: 'وعليكم السلام سلوى، ستظهر النتيجة بعد اكتمال المراجعة.',
      time: '11:25 ص'
    }
  ],

  5: [
    {
      sender: 'trainee',
      text: 'حسنًا أستاذ، سأقوم بالتعديل المطلوب.',
      time: '2:15 م'
    },
    {
      sender: 'trainer',
      text: 'ممتاز، أرسل النسخة الجديدة بعد الانتهاء.',
      time: '2:18 م'
    }
  ],

  6: [
    {
      sender: 'trainee',
      text: 'السلام عليكم أستاذ، تم استلام الرسالة.',
      time: '3:10 م'
    },
    {
      sender: 'trainer',
      text: 'وعليكم السلام أسماء، بالتوفيق.',
      time: '3:12 م'
    }
  ]
};

messages = this.messagesByTrainee[1] ?? [];

  // =====================================================
  // SELECT TRAINEE
  // =====================================================

selectTrainee(traineeId: number): void {
  this.selectedTraineeId.set(traineeId);

  const trainee = this.trainees.find(
    (item) => item.traineeId === traineeId
  );

  if (trainee) {
    trainee.unread = false;
  }

  this.messages = this.messagesByTrainee[traineeId] ?? [];
}
  selectedTrainee = computed(() =>
  this.trainees.find(
    (trainee) => trainee.traineeId === this.selectedTraineeId()
  ) ?? this.trainees[0]
);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  sendMessage(): void {

    if (
      !this.messageText.trim()
    ) {
      return;
    }

    console.log(
      'Message:',
      this.messageText
    );

    this.messageText = '';

  }

  // =====================================================
  // NEW MESSAGE
  // =====================================================

  newMessage(): void {

    this.selectedTraineeId.set(
      null
    );

    this.messageText = '';

  }

}