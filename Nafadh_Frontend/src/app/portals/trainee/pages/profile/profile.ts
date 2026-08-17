
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
}