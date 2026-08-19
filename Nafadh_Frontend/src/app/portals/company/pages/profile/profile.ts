import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyBranchDto, CompanyDto, CompanySupervisorDto, EnrollmentDto } from '../../../../core/models/dtos';

type CompanyProfileDto = CompanyDto & {
  taxNumber?: string;
  city?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  accreditationNumber?: string;
  accreditationValidUntil?: string;
  workFields?: string[];
  usedCapacity?: number;
};

type CompanySupervisorProfileDto = CompanySupervisorDto & {
  fullName?: string;
  name?: string;
  role?: string;
  position?: string;
  phone?: string;
};

export interface HostedSpecialtyDto {
  programId: number;
  name: string;
  status: 'معتمد' | 'قيد الاعتماد';
  seatsAllocated: number;
}

@Component({
  selector: 'app-company-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class CompanyProfile implements OnInit {
  companyId: number = 0;
  readonly coverInputId = 'company-cover-upload';
  readonly logoInputId = 'company-logo-upload';

  company = signal<CompanyProfileDto | null>(null);
  branches = signal<CompanyBranchDto[]>([]);
  supervisors = signal<CompanySupervisorProfileDto[]>([]);
  specialties = signal<HostedSpecialtyDto[]>([]);
  trainees = signal<EnrollmentDto[]>([]);

  companyLoadError = signal(false);
  traineesLoadError = signal(false);
  branchesLoadError = signal(false);
  supervisorsLoadError = signal(false);
  specialtiesLoadError = signal(false);

  editingCapacity = signal(false);
  companyEditOpen = signal(false);
  companyEditDraft = {
    commercialRegister: '',
    taxNumber: '',
    phone: '',
    email: '',
    website: '',
    accreditationValidUntil: '',
  };
  capacityDraft = 0;
  newFieldDraft = '';

  branchFormOpen = signal(false);
  branchDraft = { location: '', contactPoint: '' };
  supervisorFormOpen = signal(false);
  supervisorDraft = { name: '', role: '', phone: '', email: '' };

  companyInitial = computed(() => this.company()?.companyName?.trim()?.charAt(0)?.toUpperCase() ?? 'ش');

  usedCapacityValue = computed(() => {
    const c = this.company();
    if (typeof c?.usedCapacity === 'number') return c.usedCapacity;
    return this.trainees().length;
  });

  capacityPercent = computed(() => {
    const c = this.company();
    if (!c || !c.capacity || c.capacity <= 0) return 0;
    const used = this.usedCapacityValue();
    return Math.min(100, Math.round((used / c.capacity) * 100));
  });

  readonly ringCircumference = 2 * Math.PI * 62;
  ringDashoffset = computed(() => this.ringCircumference * (1 - this.capacityPercent() / 100));

  constructor(private api: CompanyApi, private auth: AuthService) {
    this.companyId = this.auth.companyId ?? 0;
  }

  ngOnInit() {
    this.api.getCompany(this.companyId).subscribe({
      next: (response) => {
        const normalizedCompany = this.normalizeCompany(response);
        this.company.set(normalizedCompany);
        this.capacityDraft = normalizedCompany?.capacity ?? 0;
        this.companyLoadError.set(false);
      },
      error: () => this.companyLoadError.set(true),
    });

    this.api.getBranches(this.companyId).subscribe({
      next: (items) => {
        this.branches.set(items ?? []);
        this.branchesLoadError.set(false);
      },
      error: () => this.branchesLoadError.set(true),
    });

    this.api.getSupervisors(this.companyId).subscribe({
      next: (items) => {
        this.supervisors.set((items ?? []).map((supervisor) => this.normalizeSupervisor(supervisor)));
        this.supervisorsLoadError.set(false);
      },
      error: () => this.supervisorsLoadError.set(true),
    });

    this.api.getCapacity(this.companyId).subscribe({
      next: (cap) => {
        this.company.update((c) => (c ? { ...c, usedCapacity: Number(cap?.used ?? 0) } : c));
        this.trainees.set([]);
        this.traineesLoadError.set(false);
      },
      error: () => this.traineesLoadError.set(true),
    });

    this.api.getCompanyPrograms(this.companyId).subscribe({
      next: (items) => {
        this.specialties.set((items ?? []).map((item) => this.normalizeSpecialty(item as Record<string, unknown>)));
        this.specialtiesLoadError.set(false);
      },
      error: () => this.specialtiesLoadError.set(true),
    });
  }

  private normalizeCompany(dto?: Partial<CompanyProfileDto> | null): CompanyProfileDto | null {
    if (!dto) return null;

    const raw = dto as Record<string, unknown>;

    const logoUrl =
      dto.logoUrl ||
      String(raw['logo'] ?? '') ||
      String(raw['companyLogo'] ?? '') ||
      String(raw['logoImageUrl'] ?? '') ||
      String(raw['imageUrl'] ?? '') ||
      '';

    const coverImageUrl =
      dto.coverImageUrl ||
      String(raw['cover'] ?? '') ||
      String(raw['coverImage'] ?? '') ||
      String(raw['coverUrl'] ?? '') ||
      String(raw['bannerUrl'] ?? '') ||
      '';

    const workFields = Array.isArray(dto.workFields) && dto.workFields.length
      ? dto.workFields
      : dto.workField
      ? [dto.workField]
      : [];

    return {
      ...dto,
      companyName: dto.companyName || 'اسم الشركة',
      workField: dto.workField || workFields[0] || 'غير محدد',
      workFields,
      logoUrl,
      coverImageUrl,
      usedCapacity: dto.usedCapacity ?? 0,
      capacity: dto.capacity ?? 0,
    } as CompanyProfileDto;
  }

  private normalizeSupervisor(supervisor: Partial<CompanySupervisorProfileDto>): CompanySupervisorProfileDto {
    const id = supervisor.supervisorId ?? supervisor.id ?? Date.now();

    return {
      ...supervisor,
      supervisorId: id,
      id,
      fullName: supervisor.fullName || supervisor.name || 'جهة اتصال',
      name: supervisor.name || supervisor.fullName || 'جهة اتصال',
      position: supervisor.position || supervisor.role || supervisor.department || 'مدير الحساب',
      role: supervisor.role || supervisor.position || supervisor.department || 'مدير الحساب',
      phone: supervisor.phone || '',
      email: supervisor.email || '',
      status: supervisor.status || 'Active',
    } as CompanySupervisorProfileDto;
  }

  private normalizeSpecialty(item: Record<string, unknown>): HostedSpecialtyDto {
    const statusValue = String(item['status'] ?? 'قيد الاعتماد');
    const status =
      statusValue === 'معتمد' || statusValue === 'قيد الاعتماد'
        ? (statusValue as 'معتمد' | 'قيد الاعتماد')
        : 'قيد الاعتماد';

    return {
      programId: Number(item['programId'] ?? item['id'] ?? Date.now()),
      name: String(item['name'] ?? item['title'] ?? 'تخصص'),
      status,
      seatsAllocated: Number(item['seatsAllocated'] ?? item['capacity'] ?? 0),
    };
  }

  saveCapacity() {
    const c = this.company();
    if (!c) return;

    this.api.updateCompany(c.companyId, { ...c, capacity: this.capacityDraft }).subscribe(() => {
      this.company.update((cur) => (cur ? { ...cur, capacity: this.capacityDraft } : cur));
      this.editingCapacity.set(false);
    });
  }

  startCompanyEdit() {
    const c = this.company();
    if (!c) return;

    this.companyEditDraft = {
      commercialRegister: c.commercialRegister || '',
      taxNumber: c.taxNumber || '',
      phone: c.phone || '',
      email: c.email || '',
      website: c.website || '',
      accreditationValidUntil: c.accreditationValidUntil || '',
    };
    this.companyEditOpen.set(true);
  }

  saveCompanyEdit() {
    const c = this.company();
    if (!c) return;

    const payload = {
      ...c,
      ...this.companyEditDraft,
      companyName: c.companyName,
      workField: c.workField,
      logoUrl: c.logoUrl,
      coverImageUrl: c.coverImageUrl,
      usedCapacity: c.usedCapacity,
      capacity: c.capacity,
    };

    this.api.updateCompany(c.companyId, payload).subscribe(() => {
      this.company.update((cur) => (cur ? { ...cur, ...this.companyEditDraft } : cur));
      this.companyEditOpen.set(false);
    });
  }

  statusLabel(value?: string | null): string {
    switch (value) {
      case 'PendingApproval':
        return 'قيد الموافقة';
      case 'Approved':
        return 'معتمد';
      case 'Suspended':
        return 'موقوف';
      case 'Rejected':
        return 'مرفوض';
      case 'Active':
        return 'نشط';
      case 'Inactive':
        return 'غير نشط';
      default:
        return value || 'نشط';
    }
  }

  workFieldList(c: CompanyProfileDto): string[] {
    if (c.workFields?.length) return c.workFields;
    if (c.workField) return [c.workField];
    return [];
  }

  addWorkField() {
    const value = this.newFieldDraft.trim();
    if (!value) return;

    this.company.update((cur) => {
      if (!cur) return cur;
      const list = [...this.workFieldList(cur), value];
      return {
        ...cur,
        workFields: list,
        workField: list[0] || 'غير محدد',
      };
    });

    this.newFieldDraft = '';
  }

  removeWorkField(field: string) {
    this.company.update((cur) =>
      cur ? { ...cur, workFields: this.workFieldList(cur).filter((f) => f !== field) } : cur
    );
  }

  addBranch() {
    this.branchFormOpen.set(true);
  }

  saveBranch() {
    const location = this.branchDraft.location.trim();
    if (!location) return;

    this.branches.update((cur) => [
      ...cur,
      {
        branchId: Date.now(),
        location,
        contactPoint: this.branchDraft.contactPoint.trim(),
        companyId: this.companyId,
      },
    ]);

    this.branchDraft = { location: '', contactPoint: '' };
    this.branchFormOpen.set(false);
  }

  addSupervisor() {
    this.supervisorFormOpen.set(true);
  }

  saveSupervisor() {
    const name = this.supervisorDraft.name.trim();
    if (!name) return;

    const supervisorId = Date.now();

    this.supervisors.update((cur) => [
      ...cur,
      {
        supervisorId,
        id: supervisorId,
        fullName: name,
        name,
        role: this.supervisorDraft.role.trim() || 'مدير الحساب',
        position: this.supervisorDraft.role.trim() || 'مدير الحساب',
        phone: this.supervisorDraft.phone.trim(),
        email: this.supervisorDraft.email.trim(),
        status: 'Active',
        userId: 0,
        companyId: this.companyId,
      } as CompanySupervisorProfileDto,
    ]);

    this.supervisorDraft = { name: '', role: '', phone: '', email: '' };
    this.supervisorFormOpen.set(false);
  }

  onCoverSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    this.company.update((cur) => (cur ? { ...cur, coverImageUrl: preview } : cur));
    input.value = '';
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    this.company.update((cur) => (cur ? { ...cur, logoUrl: preview } : cur));
    input.value = '';
  }
}