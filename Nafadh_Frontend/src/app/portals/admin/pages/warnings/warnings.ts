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
  searchTerm = '';

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

  // البحث والتصفية
  filteredWarnings(): WarningDto[] {
    if (!this.searchTerm.trim()) return this.warnings();
    return this.warnings().filter(w => 
      w.targetName?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // إحصائيات الحالات
  getCountByStatus(status: string): number {
    return this.warnings().filter(w => w.status === status).length;
  }

  // الوصول للخصائص الديناميكية بدون أخطاء TypeScript (noImplicitAny / TS7053)
  getItemProp(item: any, propName: string, fallback: string = '-'): string {
    return item && item[propName] ? item[propName] : fallback;
  }

  openDetailsModal(warning: WarningDto): void {
    this.selectedWarning.set(warning);
  }

  closeDetailsModal(): void {
    this.selectedWarning.set(null);
  }

  getAvatar(name?: string): string {
    if (!name) return 'ش';
    const words = name.trim().split(' ');
    return words.length >= 2 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : name.substring(0, 2).toUpperCase();
  }

  getTypeLabel(type?: string): string {
    switch (type) {
      case 'Performance': return 'بيئة الأداء والتدريب';
      case 'Attendance': return 'التزامات الحضور';
      case 'Behavioral': return 'الضوابط السلوكية';
      case 'Other': return 'تنظيمي آخر';
      default: return type || '-';
    }
  }

  getLevelLabel(level?: string): string {
    switch (level) {
      case 'Low': return 'منخفض';
      case 'Medium': return 'متوسط';
      case 'High': return 'مرتفع';
      case 'Critical': return 'حرج جداً';
      default: return level || 'متوسط';
    }
  }

  getLevelClass(level?: string): string {
    switch (level) {
      case 'Low': return 'lvl-low';
      case 'Medium': return 'lvl-medium';
      case 'High': return 'lvl-high';
      case 'Critical': return 'lvl-critical';
      default: return 'lvl-medium';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'Open': return 'نشط';
      case 'Resolved': return 'مكتمل';
      case 'UnderReview': return 'قيد المراجعة';
      default: return status || 'نشط';
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