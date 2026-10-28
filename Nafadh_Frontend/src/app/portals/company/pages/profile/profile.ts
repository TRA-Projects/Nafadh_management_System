import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Observable, defer, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyBranchDto, CompanyDto, CompanySupervisorDto, EnrollmentDto } from '../../../../core/models/dtos';

type ProfileSection = 'company' | 'branches' | 'supervisors' | 'capacity' | 'trainees' | 'specialties';

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
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class CompanyProfile implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal<Record<ProfileSection, boolean>>({
    company: false, branches: false, supervisors: false,
    capacity: false, trainees: false, specialties: false,
  });
  readonly coverFailed = signal(false);
  readonly branchSaveMessage = signal('');

  companyId: number = 0;

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

  companyEditOpen = signal(false);

  logoFailed = signal(false);
  companyEditDraft = {
    phone: '',
    email: '',
  };
  savingCompany = signal(false);
  saveMessage = signal('');
  saveError = signal('');
  capacityLoadError = signal(false);
  capacitySummary = signal<{ total: number; used: number; remaining: number } | null>(null);

  branchFormOpen = signal(false);
  savingBranch = signal(false);
  branchSaveError = signal('');
  branchDraft = { location: '', phone: '' };

  companyInitial = computed(() => this.company()?.companyName?.trim()?.charAt(0)?.toUpperCase() ?? 'ش');

  approvedSupervisors = computed(() =>
    this.supervisors().filter((person) => this.isApprovedSupervisor(person.status)),
  );

  usedCapacityValue = computed(() => this.capacitySummary()?.used ?? 0);
  totalCapacityValue = computed(() => this.capacitySummary()?.total ?? this.company()?.capacity ?? 0);
  remainingCapacityValue = computed(() => Math.max(0, this.totalCapacityValue() - this.usedCapacityValue()));
  capacityPercent = computed(() => {
    const total = this.totalCapacityValue();
    return total > 0 ? Math.min(100, Math.round(this.usedCapacityValue() / total * 100)) : 0;
  });

  readonly ringCircumference = 2 * Math.PI * 62;
  ringDashoffset = computed(() => this.ringCircumference * (1 - this.capacityPercent() / 100));

  ngOnInit() {
    const id = Number(this.auth.companyId);
    this.companyId = Number.isSafeInteger(id) && id > 0 ? id : 0;
    this.retryAll();
  }

  isLoading(section: ProfileSection): boolean { return this.loading()[section]; }

  retryAll() {
    if (!this.companyId) {
      this.companyLoadError.set(true);
      return;
    }
    for (const section of ['company', 'branches', 'supervisors', 'capacity', 'trainees', 'specialties'] as const) {
      this.retrySection(section);
    }
  }

  retrySection(section: ProfileSection) {
    if (!this.companyId || this.isLoading(section)) return;
    // Do not replace data underneath an active edit or branch save.
    if (section === 'company' && (this.companyEditOpen() || this.savingCompany())) return;
    if (section === 'branches' && (this.branchFormOpen() || this.savingBranch())) return;
    switch (section) {
      case 'company':
        this.load(section, () => this.api.getCompany(this.companyId), response => {
          const company = this.normalizeCompany(response);
          if (!company || Number(company.companyId) !== this.companyId) throw new Error('Invalid company response');
          this.company.set(company);
          this.logoFailed.set(false);
          this.coverFailed.set(false);
        });
        break;
      case 'branches':
        this.load(section, () => this.api.getBranches(this.companyId), items => {
          if (!Array.isArray(items)) throw new Error('Invalid branches response');
          if (items.some(item => !item || !Number.isSafeInteger(item.branchId) || item.branchId <= 0))
            throw new Error('Invalid branch id');
          this.branches.set([...new Map(items.map(item => [item.branchId, item])).values()]
            .sort((a, b) => a.branchId - b.branchId));
        });
        break;
      case 'supervisors':
        this.load(section, () => this.api.getSupervisors(this.companyId), items => {
          if (!Array.isArray(items)) throw new Error('Invalid supervisors response');
          const people = items.filter(item => !!item).map(item => this.normalizeSupervisor(item));
          if (people.some(item => typeof item.supervisorId !== 'number' || !Number.isSafeInteger(item.supervisorId) || item.supervisorId <= 0))
            throw new Error('Invalid supervisor id');
          this.supervisors.set([...new Map(people.map(item => [item.supervisorId, item])).values()]);
        });
        break;
      case 'capacity':
        this.load(section, () => this.api.getCompanyCapacitySummary(this.companyId), cap => {
          if (cap?.total == null || cap?.used == null || String(cap.total).trim() === '' || String(cap.used).trim() === '')
            throw new Error('Missing capacity');
          const total = Number(cap.total), used = Number(cap.used);
          if (!Number.isFinite(total) || !Number.isSafeInteger(used) || total < 0 || used < 0)
            throw new Error('Invalid capacity');
          this.capacitySummary.set({ total, used, remaining: Math.max(0, total - used) });
        });
        break;
      case 'trainees':
        this.load(section, () => this.api.getEnrollmentsByCompany(this.companyId), items => {
          if (!Array.isArray(items)) throw new Error('Invalid enrollments response');
          this.trainees.set(items.filter(item => !!item));
        });
        break;
      case 'specialties':
        this.load(section, () => this.api.getCompanyProgramSummaries(this.companyId), items => {
          if (!Array.isArray(items)) throw new Error('Invalid programs response');
          const programs: HostedSpecialtyDto[] = items.filter(item => !!item).map(item => ({
            programId: item.programId,
            name: item.title || 'غير محدد',
            status: item.approvedForCompany && !/suspended|inactive|rejected/i.test(String(item.status ?? ''))
              ? 'معتمد' : 'قيد الاعتماد',
            seatsAllocated: Math.max(0, Number(item.allocatedCapacity) || 0),
          }));
          if (programs.some(item => !Number.isSafeInteger(item.programId) || item.programId <= 0))
            throw new Error('Invalid program id');
          this.specialties.set([...new Map(programs.map(item => [item.programId, item])).values()]);
        });
        break;
    }
  }

  private sectionError(section: ProfileSection) {
    switch (section) {
      case 'company': return this.companyLoadError;
      case 'branches': return this.branchesLoadError;
      case 'supervisors': return this.supervisorsLoadError;
      case 'capacity': return this.capacityLoadError;
      case 'trainees': return this.traineesLoadError;
      case 'specialties': return this.specialtiesLoadError;
    }
  }

  private load<T>(section: ProfileSection, request: () => Observable<T>, apply: (value: T) => void) {
    const failed = this.sectionError(section);
    failed.set(false);
    this.loading.update(state => ({ ...state, [section]: true }));
    defer(request).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.update(state => ({ ...state, [section]: false }))),
    ).subscribe({
      next: value => {
        try { apply(value); } catch { failed.set(true); }
      },
      error: () => failed.set(true),
    });
  }

  private normalizeCompany(dto?: Partial<CompanyProfileDto> | null): CompanyProfileDto | null {
    if (!dto) return null;

    const raw = (dto as unknown) as Record<string, unknown>;

    const logoUrl =
      dto.logoUrl ||
      String(raw['logo'] ?? raw['Logo'] ?? '') ||
      String(raw['companyLogo'] ?? raw['CompanyLogo'] ?? '') ||
      String(raw['logoImageUrl'] ?? raw['LogoImageUrl'] ?? '') ||
      String(raw['imageUrl'] ?? raw['ImageUrl'] ?? '') ||
      '';

    const coverImageUrl =
      dto.coverImageUrl ||
      String(raw['cover'] ?? raw['Cover'] ?? '') ||
      String(raw['coverImage'] ?? raw['CoverImage'] ?? '') ||
      String(raw['coverUrl'] ?? raw['CoverUrl'] ?? '') ||
      String(raw['bannerUrl'] ?? raw['BannerUrl'] ?? '') ||
      '';

    const workFields = Array.isArray(dto.workFields) && dto.workFields.length
      ? dto.workFields
      : dto.workField
        ? dto.workField.split(/[،,]/).map((x) => x.trim()).filter(Boolean)
        : [];

    return {
      ...dto,
      companyName: dto.companyName || 'غير متوفر',
      workField: dto.workField || workFields[0] || '',
      workFields: [...new Set(workFields.map(field => field.trim()).filter(Boolean))],
      logoUrl,
      coverImageUrl,
      usedCapacity: dto.usedCapacity ?? 0,
      capacity: dto.capacity ?? 0,
    } as CompanyProfileDto;
  }

  private normalizeSupervisor(supervisor: Partial<CompanySupervisorProfileDto>): CompanySupervisorProfileDto {
    const id = supervisor.supervisorId ?? supervisor.id ?? 0;

    return {
      ...supervisor,
      supervisorId: id,
      id,
      fullName: supervisor.fullName || supervisor.name || '—',
      name: supervisor.name || supervisor.fullName || '—',
      position: supervisor.position || supervisor.role || supervisor.department || '—',
      role: supervisor.role || supervisor.position || supervisor.department || '—',
      phone: supervisor.phone || '',
      email: supervisor.email || '',
      status: supervisor.status ?? '—',
    } as CompanySupervisorProfileDto;
  }

  startCompanyEdit() {
    const c = this.company();
    if (!c) return;

    if (this.savingCompany() || this.savingBranch() || this.branchFormOpen()) return;
    this.saveError.set('');
    this.saveMessage.set('');
    this.companyEditDraft = {
      phone: c.phone || '',
      email: c.email || '',
    };
    this.companyEditOpen.set(true);
  }

  saveCompanyEdit() {
    const c = this.company();
    if (!c || !this.companyEditOpen() || this.savingCompany()) return;
    this.saveError.set('');
    this.saveMessage.set('');
    const phone = this.normalizePhone(this.companyEditDraft.phone);
    const email = this.companyEditDraft.email.trim();
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      this.saveError.set('أدخل رقم هاتف صحيحًا من 8 إلى 15 رقمًا.');
      return;
    }
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.saveError.set('أدخل بريدًا إلكترونيًا صحيحًا لا يتجاوز 150 حرفًا.');
      return;
    }
    this.savingCompany.set(true);
    this.api.updatePortalCompanyContact(c.companyId, { phone, email })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.savingCompany.set(false)))
      .subscribe({
        next: (updated) => {
          this.company.update(current => current ? { ...current, phone: updated?.phone ?? phone, email: updated?.email ?? email } : current);
          this.companyEditOpen.set(false);
          this.saveMessage.set('تم حفظ بيانات التواصل بنجاح.');
        },
        error: () => this.saveError.set('تعذر حفظ بيانات التواصل. تحقق من الاتصال وصلاحية الحساب ثم حاول مجددًا.'),
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
        return value || 'غير محدد';
    }
  }

  workFieldList(c: CompanyProfileDto): string[] {
    if (c.workFields?.length) return c.workFields;
    if (c.workField) return [c.workField];
    return [];
  }

  private isApprovedSupervisor(status: unknown): boolean {
    // NFD_SupervisorStatus: Active = 0, Inactive = 1, Suspended = 2
    if (typeof status === 'number') return status === 0;
    const value = String(status ?? '').trim().toLowerCase();
    return value === 'active' || value === '0' || value === 'معتمد' || value === 'نشط';
  }

  addBranch() {
    if (this.companyEditOpen() || this.savingBranch() || this.branchFormOpen() || this.branchesLoadError() || this.isLoading('branches')) return;
    this.branchSaveMessage.set('');
    this.branchSaveError.set('');
    this.branchDraft = { location: '', phone: '' };
    this.branchFormOpen.set(true);
  }

  saveBranch() {
    if (!this.branchFormOpen() || this.savingBranch()) return;
    const location = this.branchDraft.location.trim();
    const phone = this.normalizePhone(this.branchDraft.phone);
    this.branchSaveError.set('');
    if (!location || location.length > 250 || !this.companyId) {
      this.branchSaveError.set('أدخل موقع الفرع بما لا يتجاوز 250 حرفًا.');
      return;
    }
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      this.branchSaveError.set('أدخل رقم هاتف صحيحًا من 8 إلى 15 رقمًا.');
      return;
    }
    this.savingBranch.set(true);
    this.api.addBranch({ companyId: this.companyId, location, contactPoint: phone })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.savingBranch.set(false)))
      .subscribe({
        next: (branch) => {
          const saved = branch as CompanyBranchDto | null;
          if (saved && Number.isSafeInteger(saved.branchId) && saved.branchId > 0) {
            this.branches.update(current => [...current.filter(item => item.branchId !== saved.branchId), saved]
              .sort((a, b) => a.branchId - b.branchId));
          } else {
            this.branchSaveMessage.set('تم الحفظ، لكن لم تصل بيانات الفرع. اضغط إعادة تحميل الفروع للتأكد قبل إضافة الفرع مجددًا.');
            this.branchesLoadError.set(true);
          }
          if (saved && saved.branchId > 0) this.branchSaveMessage.set('تم حفظ الفرع بنجاح.');
          this.branchDraft = { location: '', phone: '' };
          this.branchFormOpen.set(false);
        },
        error: () => this.branchSaveError.set('تعذر حفظ الفرع. تحقق من الاتصال ثم حاول مجددًا.'),
      });
  }

  cancelCompanyEdit() {
    if (this.savingCompany()) return;
    this.companyEditOpen.set(false);
    this.saveError.set('');
  }

  cancelBranch() {
    if (this.savingBranch()) return;
    this.branchFormOpen.set(false);
    this.branchSaveError.set('');
  }

  private normalizePhone(value: string): string {
    return value.trim().replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    }).replace(/[\s()-]/g, '');
  }
}
