import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-warnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warnings.html',
  styleUrls: ['./warnings.css']
})
export class AdminWarnings implements OnInit {
  warnings = signal<WarningDto[]>([]);
  showIssue = signal(false);
  selectedWarning = signal<any | null>(null);
  
  newWarning = { companyId: 1, type: 'Performance', level: 'Medium', evidence: '' };

  constructor(private api: AdminApi) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getWarnings({ scope: 'Company' }).subscribe((d) => this.warnings.set(d));
  }

  issue(): void {
    this.api.createWarning({
      scope: 'Company',
      companyId: this.newWarning.companyId,
      type: this.newWarning.type,
      level: this.newWarning.level,
      evidence: this.newWarning.evidence,
      raisedByUserId: 1
    }).subscribe(() => {
      this.showIssue.set(false);
      this.load();
    });
  }

  // التحكم بمودال التفاصيل
  openDetailsModal(warning: WarningDto): void {
    this.selectedWarning.set(warning);
  }

  closeDetailsModal(): void {
    this.selectedWarning.set(null);
  }

  // اختصار اسم الشركة للشعار الدائري
  getAvatar(name?: string): string {
    if (!name) return 'ش';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getTypeLabel(type?: string): string {
    switch (type) {
      case 'Performance': return 'إخلال بالتزامات التدريب (الأداء)';
      case 'Attendance': return 'التزامات الحضور';
      case 'Behavioral': return 'سلوكي';
      case 'Other': return 'أخرى';
      default: return type || '-';
    }
  }

  getLevelLabel(level?: string): string {
    switch (level) {
      case 'Low': return 'أصفر (منخفض)';
      case 'Medium': return 'أصفر';
      case 'High': return 'برتقالي';
      case 'Critical': return 'أحمر (حرج)';
      default: return level || 'أصفر';
    }
  }

  getLevelClass(level?: string): string {
    switch (level) {
      case 'Low': return 'lvl-yellow';
      case 'Medium': return 'lvl-yellow';
      case 'High': return 'lvl-orange';
      case 'Critical': return 'lvl-red';
      default: return 'lvl-yellow';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'Open': return 'مفتوح';
      case 'Resolved': return 'محلول';
      case 'UnderReview': return 'قيد المعالجة';
      default: return status || 'مفتوح';
    }
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'Open': return 'st-open';
      case 'Resolved': return 'st-resolved';
      case 'UnderReview': return 'st-review';
      default: return 'st-open';
    }
  }
}