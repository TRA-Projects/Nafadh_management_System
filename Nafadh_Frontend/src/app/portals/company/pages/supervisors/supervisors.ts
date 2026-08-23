import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface Supervisor {
  supervisorId?: number;
  id?: number;
  fullName: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  stats?: {
    assignedTrainees: number;
    attendanceRate: string;
    monthlyEvaluations: number;
  };
  avatarColor?: string;
  isInactive?: boolean;
  showMenu?: boolean;
}

export interface Trainee {
  id: number;
  name: string;
  track: string;
  batch: string;
  initials: string;
  color: string;
  assigned: boolean;
}

@Component({
  selector: 'app-company-supervisors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './supervisors.html',
  styleUrl: './supervisors.scss'
})
export class CompanySupervisors {
  showAddModal = false;
  isDistributeModalOpen = false;
  selectedSupervisor: Supervisor | null = null;

  searchQuery = '';
  selectedDept = 'all';

  newSupervisor: Supervisor = {
    fullName: '',
    department: '',
    position: '',
    email: '',
    phone: ''
  };

  supervisors: Supervisor[] = [
    { supervisorId: 1, fullName: 'طارق بن جمعة السالمي', department: 'الأمن السيبراني', position: 'مشرف تقني', email: 't.alsalmi@ufuq-tech.om', avatarColor: 'navy', stats: { assignedTrainees: 3, attendanceRate: '92.0%', monthlyEvaluations: 6 } },
    { supervisorId: 2, fullName: 'سعاد بنت محمد الشامسية', department: 'الموارد البشرية', position: 'مشرفة التدريب', email: 's.alshamsiya@ufuq-tech.om', avatarColor: 'cyan', stats: { assignedTrainees: 4, attendanceRate: '95.3%', monthlyEvaluations: 8 } },
    { supervisorId: 3, fullName: 'خالد بن عبدالله المعمري', department: 'تقنية المعلومات', position: 'رئيس قسم', email: 'k.almaamari@ufuq-tech.om', avatarColor: 'navy', stats: { assignedTrainees: 3, attendanceRate: '90.8%', monthlyEvaluations: 6 } },
    { supervisorId: 4, fullName: 'ليلى بنت ناصر الكيومية', department: 'التسويق', position: 'مشرفة التسويق', email: 'l.alkiyumiya@ufuq-tech.om', avatarColor: 'cyan', stats: { assignedTrainees: 1, attendanceRate: '78.0%', monthlyEvaluations: 2 } },
    { supervisorId: 5, fullName: 'ياسر بن حمد السالمي', department: 'العمليات', position: 'مشرف عمليات', email: 'y.alsalmi@ufuq-tech.om', avatarColor: 'gold', stats: { assignedTrainees: 0, attendanceRate: '0%', monthlyEvaluations: 0 } }
  ];

  traineesList: Trainee[] = [
    { id: 1, name: 'يوسف بن سالم الحارثي', track: 'تحليل البيانات', batch: '2026-ب', initials: 'يس', color: 'cyan', assigned: true },
    { id: 2, name: 'مريم بنت راشد السياابية', track: 'تحليل البيانات', batch: '2026-ب', initials: 'مر', color: 'teal', assigned: false },
    { id: 3, name: 'خالد بن عبدالله العامري', track: 'الأمن السيبراني', batch: '2026-ج', initials: 'خع', color: 'navy', assigned: true },
    { id: 4, name: 'نورة بنت حمد الهنائية', track: 'الأمن السيبراني', batch: '2026-ج', initials: 'نح', color: 'blue', assigned: false },
    { id: 5, name: 'رقية بنت علي الشحية', track: 'تحليل البيانات', batch: '2026-ب', initials: 'رع', color: 'cyan', assigned: false },
    { id: 6, name: 'شيماء بنت سيف البطاشية', track: 'الأمن السيبراني', batch: '2026-ج', initials: 'شس', color: 'navy', assigned: true },
    { id: 7, name: 'أمل بنت سلطان الزدجالية', track: 'تطوير تطبيقات الويب', batch: '2026-أ', initials: 'أس', color: 'indigo', assigned: false }
  ];

  get totalAssignedTrainees(): number {
    return this.supervisors.reduce((acc, s) => acc + (s.stats?.assignedTrainees || 0), 0);
  }

  get averageAttendance(): number {
    const valid = this.supervisors.filter(s => s.stats?.attendanceRate && s.stats.attendanceRate !== '—%');
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, s) => acc + parseFloat(s.stats!.attendanceRate), 0);
    return Math.round(sum / valid.length);
  }

  get filteredSupervisors(): Supervisor[] {
    return this.supervisors.filter(s => {
      const matchesSearch = s.fullName.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            (s.email && s.email.toLowerCase().includes(this.searchQuery.toLowerCase()));
      const matchesDept = this.selectedDept === 'all' || s.department === this.selectedDept;
      return matchesSearch && matchesDept;
    });
  }

  initials(name: string): string {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  refreshData() {
    alert('تم تحديث البيانات بنجاح!');
  }

  openAddModal() { this.showAddModal = true; }
  closeAddModal() { this.showAddModal = false; }

  openDistributeModal(supervisor: Supervisor) {
    this.selectedSupervisor = supervisor;
    this.isDistributeModalOpen = true;
  }
  closeDistributeModal() {
    this.isDistributeModalOpen = false;
    this.selectedSupervisor = null;
  }

  saveDistribution() {
    if (this.selectedSupervisor) {
      const assignedCount = this.traineesList.filter(t => t.assigned).length;
      if (this.selectedSupervisor.stats) {
        this.selectedSupervisor.stats.assignedTrainees = assignedCount;
      }
    }
    this.closeDistributeModal();
  }

  toggleDropdown(s: Supervisor, event: Event) {
    event.stopPropagation();
    const currentState = s.showMenu;
    this.supervisors.forEach(item => item.showMenu = false);
    s.showMenu = !currentState;
  }

  @HostListener('document:click')
  closeAllMenus() {
    this.supervisors.forEach(s => s.showMenu = false);
  }

  toggleStatus(s: Supervisor) {
    s.isInactive = !s.isInactive;
    s.showMenu = false;
  }

  deleteSupervisor(s: Supervisor) {
    this.supervisors = this.supervisors.filter(item => (item.supervisorId ?? item.id) !== (s.supervisorId ?? s.id));
  }

  editSupervisor(s: Supervisor) {
    s.showMenu = false;
    alert(`تعديل بيانات المشرف: ${s.fullName}`);
  }

  submitNewSupervisor() {
    if (!this.newSupervisor.fullName.trim()) return;
    this.supervisors.unshift({
      supervisorId: this.supervisors.length + 1,
      fullName: this.newSupervisor.fullName,
      department: this.newSupervisor.department || 'القسم العام',
      position: this.newSupervisor.position || 'مشرف جديد',
      email: this.newSupervisor.email || 'name@company.om',
      phone: this.newSupervisor.phone,
      avatarColor: 'navy',
      stats: { assignedTrainees: 0, attendanceRate: '0%', monthlyEvaluations: 0 }
    });
    this.newSupervisor = { fullName: '', department: '', position: '', email: '', phone: '' };
    this.closeAddModal();
  }
}