import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-trainee-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trainee-details.html',
  styleUrls: ['./trainees.css']
})
export class TraineeDetailsComponent implements OnInit {
  traineeId = signal<string | null>(null);

  // بيانات نموذجية للمتدرب (يمكن استبدالها بطلب من الـ API مستقبلاً)
  traineeData = signal({
    fullName: 'خالد سعيد المطيري',
    nationalId: '1092837465',
    university: 'جامعة الملك سعود',
    major: 'هندسة برمجيات',
    companyName: 'شركة التقنية المتقدمة',
    batch: 'الدفعة 12',
    code: 'T-2401',
    status: 'نشط',
    attendanceRate: '91%',
    avgRating: '87.4',
    warnings: 1,
    absenceDays: 3
  });

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // جلب معرف المتدرب من الرابط (/admin/trainees/:id)
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.traineeId.set(id);
      // هنا يمكنك استدعاء الخدمة لجلب بيانات المتدرب حسب الـ ID
      // this.api.getTraineeById(id).subscribe(data => this.traineeData.set(data));
    }
  }
}