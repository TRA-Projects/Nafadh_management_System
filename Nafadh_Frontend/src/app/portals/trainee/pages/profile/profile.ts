import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { TraineeProfileDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class TraineeProfile implements OnInit {
  traineeId = 1;
  trainee = signal<TraineeProfileDto | null>(null);
  editing = signal(false);

  // متغير للفيو المؤقت للصورة الشخصية
  avatarUrl = signal<string | null>(null);

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.api.getTrainee(this.traineeId).subscribe((t) => this.trainee.set(t));
  }

  toggleEdit() {
    if (this.editing()) {
      const t = this.trainee();
      if (t) this.api.updateTrainee(t.traineeId, t).subscribe();
    }
    this.editing.update((v) => !v);
  }

  // معالجة رفع الصورة الشخصية وعرضها مباشرة
  onAvatarUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // تحويل الصورة لرابط معاينة
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);

      // تحديث بيانات المتدرب بحقل الصورة إذا لزم الأمر
      this.trainee.update((current) => {
        if (!current) return current;
        return {
          ...current,
          avatar: file.name
        } as any;
      });
    }
  }

  // تحويل نص المهارات القادم من الـ DTO إلى مصفوفة للعرض
  getSkillsList(skills: any): string[] {
    if (!skills) return ['Python', 'Machine Learning', 'React', 'SQL'];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  }

  // إضافة مهارة جديدة وتحديث الـ Signal
  addSkill() {
    const newSkill = prompt('أدخل اسم المهارة الجديدة:');
    if (!newSkill || !newSkill.trim()) return;

    this.trainee.update((current) => {
      if (!current) return current;
      const skillsArr = this.getSkillsList(current.skills);
      skillsArr.push(newSkill.trim());

      return {
        ...current,
        skills: skillsArr.join(', ')
      };
    });
  }

  // حذف مهارة بناءً على المقطع المحدد وتحديث الـ Signal
  removeSkill(index: number) {
    this.trainee.update((current) => {
      if (!current) return current;
      const skillsArr = this.getSkillsList(current.skills);
      skillsArr.splice(index, 1);

      return {
        ...current,
        skills: skillsArr.join(', ')
      };
    });
  }

  // معالجة رفع ملف السيرة الذاتية وتحديث اسمها في الـ Signal
  onCvUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      this.trainee.update((current) => {
        if (!current) return current;
        return {
          ...current,
          cvFileName: file.name
        } as any;
      });
    }
  }
}