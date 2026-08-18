
// import { Component, OnInit, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { TraineeApi } from '../../services/trainee-api';

// @Component({
//   selector: 'app-trainee-profile',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './profile.html',
// })
// export class TraineeProfile implements OnInit {
//   traineeId = 1;
//   trainee = signal<any>(null);
//   editing = signal(false);

//   // الخواص التي يطلبها الـ HTML
//   avatarUrl = signal<string | null>(null);

//   constructor(private api: TraineeApi) {}

//   ngOnInit() {
//     this.loadTraineeData();
//   }

//   loadTraineeData() {
//     this.api.getTrainee(this.traineeId).subscribe({
//       next: (t) => this.trainee.set(t),
//       error: (err) => console.error('خطأ في جلب البيانات:', err)
//     });
//   }

//   toggleEdit() {
//     if (this.editing()) {
//       const t = this.trainee();
//       if (t) {
//         const payload = {
//           ...t,
//           nationalId: Number(t.nationalId) || 0,
//         };

//         const targetId = t.traineeId || t.id || this.traineeId;

//         this.api.updateTrainee(targetId, payload).subscribe({
//           next: () => {
//             this.editing.set(false);
//             this.loadTraineeData();
//           },
//           error: (err) => {
//             console.error('فشل التحديث:', err);
//             this.editing.set(false);
//           }
//         });
//       } else {
//         this.editing.set(false);
//       }
//     } else {
//       this.editing.set(true);
//     }
//   }

//   // الدالة الأولى المطلوبة في الـ HTML
//   onAvatarUpload(event: Event) {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files.length > 0) {
//       const file = input.files[0];
//       const reader = new FileReader();
//       reader.onload = () => this.avatarUrl.set(reader.result as string);
//       reader.readAsDataURL(file);

//       this.trainee.update((current) => ({ ...current, avatar: file.name }));
//     }
//   }

//   // الدالة الثانية المطلوبة في الـ HTML
//   onCvUpload(event: Event) {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files.length > 0) {
//       const file = input.files[0];
//       this.trainee.update((current) => ({ ...current, cvFileName: file.name, resumeUrl: file.name }));
//     }
//   }

//   getSkillsList(skills: any): string[] {
//     if (!skills) return ['Python', 'Machine Learning', 'React', 'SQL'];
//     if (Array.isArray(skills)) return skills;
//     if (typeof skills === 'string') return skills.split(',').map((s) => s.trim()).filter(Boolean);
//     return [];
//   }

//   addSkill() {
//     const newSkill = prompt('أدخل اسم المهارة الجديدة:');
//     if (!newSkill || !newSkill.trim()) return;

//     this.trainee.update((current) => {
//       if (!current) return current;
//       const skillsArr = this.getSkillsList(current.skills);
//       skillsArr.push(newSkill.trim());
//       return { ...current, skills: skillsArr.join(', ') };
//     });
//   }

//   removeSkill(index: number) {
//     this.trainee.update((current) => {
//       if (!current) return current;
//       const skillsArr = this.getSkillsList(current.skills);
//       skillsArr.splice(index, 1);
//       return { ...current, skills: skillsArr.join(', ') };
//     });
//   }
// }

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';

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

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.getLoggedInUserId();
    this.loadTraineeData();
  }

  private getLoggedInUserId() {
    try {
      // 1. البحث في كل المفاتيح المحتملة للـ Storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const parsed = JSON.parse(val);
            const foundId = parsed.traineeId || parsed.userId || parsed.id;
            if (foundId) {
              this.traineeId = Number(foundId);
              return;
            }
          }
        }
      }

      // 2. البحث في التوكن إن وجد
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('user_session');
      if (token && token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const id = payload.traineeId || payload.userId || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        if (id) {
          this.traineeId = Number(id);
        }
      }
    } catch (e) {
      console.warn('تنبيه قراءة التوكن:', e);
    }
  }

  loadTraineeData() {
    this.api.getTrainee(this.traineeId).subscribe({
      next: (t) => {
        if (t) {
          this.trainee.set(t);
        }
      },
      error: (err) => {
        console.error('خطأ في جلب البيانات:', err);
        // في حال فشل السيرفر، يتم المحاولة بالـ ID الثاني
        if (this.traineeId !== 2) {
          this.traineeId = 2;
          this.loadTraineeData();
        }
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