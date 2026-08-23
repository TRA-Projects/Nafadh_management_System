import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

  uploadingCover = signal(false);
  uploadingLogo = signal(false);
  coverUploadError = signal(false);
  logoUploadError = signal(false);
  readonly maxImageSizeMb = 5;
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
  supervisorDraft = { userId: '', name: '', role: '', phone: '', email: '' };

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
        if (normalizedCompany) {
          try {
            const storedCover = localStorage.getItem(`nafadh-company-${normalizedCompany.companyId}-cover`);
            const storedLogo = localStorage.getItem(`nafadh-company-${normalizedCompany.companyId}-logo`);
            if (storedCover) normalizedCompany.coverImageUrl = storedCover;
            if (storedLogo) normalizedCompany.logoUrl = storedLogo;
          } catch {
            // Ignore local storage read failures.
          }
        }
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

    this.api.getCompanyProgramSummaries(this.companyId).subscribe({
      next: (items) => {
        this.specialties.set((items ?? []).map((item) => ({
          programId: item.programId,
          name: item.title,
          status: item.approvedForCompany && !/suspended|inactive|rejected/i.test(item.status)
            ? 'معتمد'
            : 'قيد الاعتماد',
          seatsAllocated: Number(item.allocatedCapacity ?? 0),
        })));
        this.specialtiesLoadError.set(false);
      },
      error: (error) => {
        console.error('Failed to load company program summaries:', error);
        this.specialties.set([]);
        this.specialtiesLoadError.set(true);
      },
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
      workField: dto.workField || workFields[0] || 'غير محدد',
      workFields,
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
      status: supervisor.status || '—',
    } as CompanySupervisorProfileDto;
  }

  saveCapacity() {
    const c = this.company();
    if (!c) return;

    const payload = this.buildCompanyUpdatePayload(c, {
      capacity: Math.max(0, Number(this.capacityDraft ?? 0)),
    });

    this.api.updateCompany(c.companyId, payload).subscribe({
      next: (updated) => {
        const merged = this.normalizeCompany({ ...c, ...(updated as Partial<CompanyProfileDto>), capacity: Number(this.capacityDraft ?? 0) });
        if (merged) this.company.set(merged);
        this.editingCapacity.set(false);
      },
      error: (error) => console.error('Failed to update company capacity:', error),
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

    const payload = this.buildCompanyUpdatePayload(c, {
      commercialRegister: this.companyEditDraft.commercialRegister.trim() || null,
      phone: this.companyEditDraft.phone.trim() || null,
      email: this.companyEditDraft.email.trim() || null,
    });

    this.api.updateCompany(c.companyId, payload).subscribe({
      next: (updated) => {
        const merged = this.normalizeCompany({
          ...c,
          ...(updated as Partial<CompanyProfileDto>),
          commercialRegister: this.companyEditDraft.commercialRegister.trim(),
          phone: this.companyEditDraft.phone.trim(),
          email: this.companyEditDraft.email.trim(),
        });
        if (merged) this.company.set(merged);
        this.companyEditOpen.set(false);
      },
      error: (error) => console.error('Failed to update company profile:', error),
    });
  }

  private buildCompanyUpdatePayload(
    c: CompanyProfileDto,
    patch: Record<string, unknown> = {},
  ) {
    return {
      companyName: c.companyName,
      commercialRegister: c.commercialRegister || null,
      workField: c.workField || null,
      address: c.address || null,
      phone: c.phone || null,
      email: c.email || null,
      logo: c.logoUrl || c.logo || null,
      capacity: Number(patch['capacity'] ?? c.capacity ?? 0),
      status: c.status,
      approvalDate: c.approvalDate || null,
      userId: c.userId ?? null,
      ...patch,
    };
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

  addWorkField() {
    const value = this.newFieldDraft.trim();
    const c = this.company();
    if (!value || !c) return;

    const list = Array.from(new Set([...this.workFieldList(c), value]));
    const workField = list.join('، ');

    this.api.updateCompany(c.companyId, this.buildCompanyUpdatePayload(c, { workField })).subscribe({
      next: (updated) => {
        const merged = this.normalizeCompany({ ...c, ...(updated as Partial<CompanyProfileDto>), workField, workFields: list });
        if (merged) this.company.set(merged);
        this.newFieldDraft = '';
      },
      error: (error) => console.error('Failed to add work field:', error),
    });
  }

  removeWorkField(field: string) {
    const c = this.company();
    if (!c) return;

    const list = this.workFieldList(c).filter((f) => f !== field);
    const workField = list.join('، ');

    this.api.updateCompany(c.companyId, this.buildCompanyUpdatePayload(c, { workField })).subscribe({
      next: (updated) => {
        const merged = this.normalizeCompany({ ...c, ...(updated as Partial<CompanyProfileDto>), workField, workFields: list });
        if (merged) this.company.set(merged);
      },
      error: (error) => console.error('Failed to remove work field:', error),
    });
  }

  addBranch() {
    this.branchFormOpen.set(true);
  }

  saveBranch() {
    const location = this.branchDraft.location.trim();
    if (!location || !this.companyId) return;

    this.api.addBranch({
      companyId: this.companyId,
      location,
      contactPoint: this.branchDraft.contactPoint.trim() || null,
    }).subscribe({
      next: (branch) => {
        this.branches.update((cur) => [...cur, branch as CompanyBranchDto]);
        this.branchDraft = { location: '', contactPoint: '' };
        this.branchFormOpen.set(false);
      },
      error: (error) => {
        console.error('Failed to add company branch:', error);
      },
    });
  }

  addSupervisor() {
    this.supervisorFormOpen.set(true);
  }

  saveSupervisor() {
    const userId = Number(this.supervisorDraft.userId);
    if (!userId || !this.companyId) return;

    // The current backend endpoint accepts a real supervisor creation DTO.
    // Keep the UI contract small and let the API validate required fields.
    this.api.addSupervisor({
      userId,
      department: this.supervisorDraft.role.trim() || null,
      position: this.supervisorDraft.role.trim() || null,
      companyId: this.companyId,
    }).subscribe({
      next: () => {
        this.supervisorDraft = { userId: '', name: '', role: '', phone: '', email: '' };
        this.supervisorFormOpen.set(false);
        this.api.getSupervisors(this.companyId).subscribe({
          next: (items) => this.supervisors.set((items ?? []).map((x) => this.normalizeSupervisor(x))),
          error: () => undefined,
        });
      },
      error: (error) => {
        console.error('Failed to add company supervisor:', error);
      },
    });
  }

  onCoverSelected(event: Event) {
    this.handleImageSelection(event, 'cover');
  }

  onLogoSelected(event: Event) {
    this.handleImageSelection(event, 'logo');
  }

  removeCoverImage() {
    this.persistImage('cover', '');
  }

  removeLogoImage() {
    this.persistImage('logo', '');
  }

  private handleImageSelection(event: Event, kind: 'cover' | 'logo') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!this.isValidImageFile(file)) {
      (kind === 'cover' ? this.coverUploadError : this.logoUploadError).set(true);
      return;
    }

    (kind === 'cover' ? this.coverUploadError : this.logoUploadError).set(false);

    const previousUrl = kind === 'cover' ? this.company()?.coverImageUrl : this.company()?.logoUrl;
    const previewUrl = URL.createObjectURL(file);

    this.applyImageToCompany(kind, previewUrl);
    (kind === 'cover' ? this.uploadingCover : this.uploadingLogo).set(true);

    this.readFileAsDataUrl(file)
      .then((dataUrl) => this.persistImage(kind, dataUrl, previousUrl))
      .catch(() => this.revertImage(kind, previousUrl))
      .finally(() => {
        URL.revokeObjectURL(previewUrl);
        (kind === 'cover' ? this.uploadingCover : this.uploadingLogo).set(false);
      });
  }

  private persistImage(kind: 'cover' | 'logo', value: string, fallbackUrl?: string) {
    const c = this.company();
    if (!c) return;

    const uploadingSignal = kind === 'cover' ? this.uploadingCover : this.uploadingLogo;
    const errorSignal = kind === 'cover' ? this.coverUploadError : this.logoUploadError;

    uploadingSignal.set(true);
    errorSignal.set(false);

    // The current backend schema stores only a Logo URL and has no binary
    // file-upload endpoint/cover column. Keep the selected image usable in
    // the Company Portal without sending an oversized base64 payload to an
    // unrelated text field. A future storage endpoint can replace this block
    // without changing the page design.
    try {
      localStorage.setItem(`nafadh-company-${c.companyId}-${kind}`, value);
    } catch (error) {
      console.error(`Failed to store ${kind} preview locally:`, error);
      this.revertImage(kind, fallbackUrl);
      errorSignal.set(true);
    }

    if (!errorSignal()) {
      this.applyImageToCompany(kind, value);
    }

    uploadingSignal.set(false);
  }

  private applyImageToCompany(kind: 'cover' | 'logo', value: string) {
    this.company.update((cur) =>
      cur ? (kind === 'cover' ? { ...cur, coverImageUrl: value } : { ...cur, logoUrl: value }) : cur
    );
  }

  private revertImage(kind: 'cover' | 'logo', fallbackUrl?: string) {
    this.applyImageToCompany(kind, fallbackUrl || '');
  }

  private isValidImageFile(file: File): boolean {
    const isImage = file.type.startsWith('image/');
    const withinSize = file.size <= this.maxImageSizeMb * 1024 * 1024;
    return isImage && withinSize;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}