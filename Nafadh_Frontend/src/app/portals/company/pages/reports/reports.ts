import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent {
  
  // المتغير المسؤول عن التبويب النشط
  activeTab: string = 'company-attendance';

  // دالة تغيير التبويب عند النقر
  selectTab(tabId: string): void {
    this.activeTab = tabId;
  }

  weeklyAttendance = [
    { weekName: 'الأسبوع 27', percentage: 95.1 },
    { weekName: 'الأسبوع 28', percentage: 93.4 },
    { weekName: 'الأسبوع 29', percentage: 96.8 },
    { weekName: 'الأسبوع 30', percentage: 92.7 },
    { weekName: 'الأسبوع 31', percentage: 94.5 },
    { weekName: 'الأسبوع 32', percentage: 95.6 },
  ];

  departmentAttendance = [
    {
      name: 'تقنية المعلومات',
      traineesCount: 46,
      attendanceRate: 96,
      absence: 4,
      lateCount: 8,
      evaluation: 'ممتاز',
      evalClass: 'eval-excellent',
      color: '#0d9488'
    },
    {
      name: 'الموارد البشرية',
      traineesCount: 12,
      attendanceRate: 95,
      absence: 2,
      lateCount: 3,
      evaluation: 'ممتاز',
      evalClass: 'eval-excellent',
      color: '#0d9488'
    },
    {
      name: 'العمليات',
      traineesCount: 24,
      attendanceRate: 91,
      absence: 5,
      lateCount: 9,
      evaluation: 'جيد',
      evalClass: 'eval-good',
      color: '#d97706'
    },
    {
      name: 'التسويق',
      traineesCount: 8,
      attendanceRate: 78,
      absence: 6,
      lateCount: 7,
      evaluation: 'يحتاج متابعة',
      evalClass: 'eval-warning',
      color: '#dc2626'
    }
  ];
}