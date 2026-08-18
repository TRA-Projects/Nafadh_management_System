import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { TrainerApi } from '../../services/trainer-api';
import { TrainerBatchDto } from '../../../../core/models/dtos'; 

@Component({
  selector: 'app-trainer-batches',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './batches.html'
})
export class TrainerBatches implements OnInit {
  trainerId = 1;
  batches = signal<TrainerBatchDto[]>([]);
  selected = signal<TrainerBatchDto | null>(null);
  
  // المتغير المسؤول عن الانتقال للقسم المحدد
  activeSection = signal<string | null>(null);

  showAnnounce = signal(false);
  announceMsg = '';

  constructor(private api: TrainerApi, private router: Router) {}

  ngOnInit() { 
    this.api.getMyBatches(this.trainerId).subscribe((d) => this.batches.set(d ?? [])); 
  }

  select(b: TrainerBatchDto) { 
    this.selected.set(b); 
    this.activeSection.set(null); 
  }

  back() { 
    if (this.activeSection() !== null) {
      this.activeSection.set(null); // العودة من القسم إلى شاشة الكاردات الأربعة
    } else {
      this.selected.set(null); // العودة من شاشة الكاردات إلى قائمة الدفعات
    }
  }

  // عند الضغط على أي كارت، يتم التوجيه للصفحة الخاصة به مباشرة
  openSection(sectionName: string) {
    if (sectionName === 'content') {
      this.activeSection.set('content'); // فتح صفحة إدارة المحتوى الخاصة بك وتفاصيلها
    } else if (sectionName === 'tasks') {
      this.router.navigate(['/trainer/tasks']); // أو مسار صفحة المهام والمشروعات لديك
    } else if (sectionName === 'evaluations') {
      this.router.navigate(['/trainer/evaluations']); // أو مسار صفحة التقييمات
    } else if (sectionName === 'trainees') {
      this.router.navigate(['/trainer/trainees']); // أو مسار صفحة عرض المتدربين
    }
  }

  // دالة القائمة الجانبية (Sidebar)
  setSection(sectionName: string | null) {
    this.activeSection.set(sectionName);
  }

  getBatchImage(index: number): string {
    const images = [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80'
    ];
    return images[index % images.length];
  }

  postAnnouncement() {
    const b = this.selected();
    if (!b) return;
    this.api.postAnnouncement({ 
      scopeType: 'Batch', 
      scopeId: b.batchId, 
      message: this.announceMsg, 
      createdByUserId: 3 
    }).subscribe(() => {
      this.showAnnounce.set(false);
      this.announceMsg = '';
    });
  }
}