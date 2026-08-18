import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';

@Component({
  selector: 'app-trainer-content',
  imports: [CommonModule, FormsModule],
  templateUrl: './content.html',
})
export class TrainerContent {
  // حالة ظهور النوافذ المنبثقة (Modals)
  showModal = signal(false);
  showFileModal = signal(false);
  showRefModal = signal(false);

  // حقول نموذج الوحدات والدروس
  title = '';
  programIdInput = 1;

  // حقول نموذج رفع الملفات والفيديوهات
  fileTitle = '';
  selectedFile: File | null = null;

  // حقول نموذج الروابط والمراجع
  refLink = '';

  constructor(private api: TrainerApi) {}

  // دالة إنشاء وحدة أو درس
  create() {
    this.api.createModule({ title: this.title, programId: this.programIdInput, orderIndex: 1 }).subscribe(() => {
      this.showModal.set(false);
      this.title = '';
    });
  }

  // دالة التقاط الملف عند اختياره من الجهاز
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // دالة رفع المادة أو الفيديو
  uploadFile() {
    console.log('Uploading file:', this.fileTitle, this.selectedFile);
    this.showFileModal.set(false);
    this.fileTitle = '';
    this.selectedFile = null;
  }

  // دالة إضافة المرجع أو الرابط
  addReference() {
    console.log('Adding reference:', this.refLink);
    this.showRefModal.set(false);
    this.refLink = '';
  }
}