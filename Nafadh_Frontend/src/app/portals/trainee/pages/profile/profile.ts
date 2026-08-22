import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { TraineeService } from '../../../../services/trainee';
@Component({
  selector: 'app-trainee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class TraineeProfile implements OnInit {
  traineeId = 1;
  trainee = signal<any>(null);
  editing = signal(false);

  avatarUrl = signal<string | null>(null);

  // أضفنا الخدمة الجديدة هنا في الـ constructor إلى جانب الخدمة القديمة
  constructor(private api: TraineeApi, private traineeService: TraineeService) {}

  ngOnInit() {
    this.loadTraineeData();
  }

  loadTraineeData() {
    // استخدام الـ UserId الخاص بكِ (2) لجلب بياناتك عبر الـ Endpoint الجديد مباشرة
    const myUserId = 2; 

    this.traineeService.getTraineeByUserId(myUserId).subscribe({
      next: (t) => {
        if (t) {
          this.trainee.set(t);
          console.log('تم تحميل بيانات المتدربة بنجاح:', t);
        }
      },
      error: (err) => {
        console.error('خطأ في جلب بيانات المتدربة:', err);
      }
    });
  }

  toggleEdit() {
    if (this.editing()) {
      const t = this.trainee();
      if (t) {
        const payload = {
          ...t,
          nationalId: Number(t.nationalId) || 0,
        };

        const targetId = t.traineeId || t.id || this.traineeId;

        this.api.updateTrainee(targetId, payload).subscribe({
          next: () => {
            this.editing.set(false);
            this.loadTraineeData();
          },
          error: (err) => {
            console.error('فشل التحديث:', err);
            this.editing.set(false);
          }
        });
      } else {
        this.editing.set(false);
      }
    } else {
      this.editing.set(true);
    }
  }

  onAvatarUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.avatarUrl.set(reader.result as string);
      reader.readAsDataURL(file);

      this.trainee.update((current) => ({ ...current, avatar: file.name }));
    }
  }

  onCvUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.trainee.update((current) => ({ ...current, cvFileName: file.name, resumeUrl: file.name }));
    }
  }

  getSkillsList(skills: any): string[] {
    if (!skills) return ['Python', 'Machine Learning', 'React', 'SQL'];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  }

  addSkill() {
    const newSkill = prompt('أدخل اسم المهارة الجديدة:');
    if (!newSkill || !newSkill.trim()) return;

    this.trainee.update((current) => {
      if (!current) return current;
      const skillsArr = this.getSkillsList(current.skills);
      skillsArr.push(newSkill.trim());
      return { ...current, skills: skillsArr.join(', ') };
    });
  }

  removeSkill(index: number) {
    this.trainee.update((current) => {
      if (!current) return current;
      const skillsArr = this.getSkillsList(current.skills);
      skillsArr.splice(index, 1);
      return { ...current, skills: skillsArr.join(', ') };
    });
  }
}