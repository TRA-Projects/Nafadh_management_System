/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { IdentityAccessApiService } from '../../legacy/core/api/services/identity-access-api.service';
import type {
  IdentityAccessUserGroupDto,
  IdentityAccessUserRowDto,
  IdentityAccessUserTypeDto,
} from '../../legacy/core/api/models/identity-access.models';
import { PAGE_SIZE_OPTIONS, type PageSize } from '../../legacy/core/api/models/paged-list.models';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { identityAccessFeature } from '../../legacy/core/store/identity-access/identity-access.reducer';
import { AssetUrlPipe } from '../../legacy/core/ui/asset-url.pipe';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { BackArrowButtonComponent } from '../../legacy/core/ui/back-arrow-button/back-arrow-button.component';
import { FormPipelineService } from '../../legacy/core/ui/form-pipeline.service';
import {
  AngularValidators,
  ValidationMessagePipe,
  emailFormat,
  passwordFreelancerRules,
  requiredTrimmed,
} from '../../legacy/core/validators';

const SYSTEM_USER_TYPE_CODE = 'System';

@Component({
  selector: 'app-admin-identity-users-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ValidationMessagePipe,
    AssetUrlPipe,
    BackArrowButtonComponent,
  ],
  templateUrl: './admin-identity-users-page.component.html',
  styleUrl: './admin-identity-users-page.component.scss',
})
export class AdminIdentityUsersPageComponent implements OnInit {
  readonly homePath = '/admin/dashboard';
  private readonly api = inject(IdentityAccessApiService);
  private readonly store = inject(Store);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly formPipeline = inject(FormPipelineService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly locale = inject(LocaleService);

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly draftQuery = signal('');
  readonly query = signal('');
  readonly draftTypeId = signal<number | null>(null);
  readonly typeId = signal<number | null>(null);
  readonly draftGroupId = signal<number | null>(null);
  readonly groupId = signal<number | null>(null);
  readonly draftActive = signal<'all' | 'active' | 'inactive'>('all');
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly listLoadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal<string | null>(null);
  readonly editingUser = signal<IdentityAccessUserRowDto | null>(null);
  readonly createUserOpen = signal(false);
  readonly actionsMenuRowId = signal<string | null>(null);
  readonly drawerOpen = signal(false);

  readonly editForm = this.fb.nonNullable.group({
    name: ['', [requiredTrimmed(), AngularValidators.maxLength(200)]],
    email: ['', [requiredTrimmed(), emailFormat(), AngularValidators.maxLength(256)]],
    isActive: [true],
  });

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [requiredTrimmed(), AngularValidators.maxLength(200)]],
    email: ['', [requiredTrimmed(), emailFormat(), AngularValidators.maxLength(256)]],
    password: ['', [requiredTrimmed(), passwordFreelancerRules(), AngularValidators.minLength(8)]],
    userGroupId: [0, [Validators.required, Validators.min(1)]],
  });

  private readonly usersPage = toSignal(this.store.select(identityAccessFeature.selectUsersPage), {
    initialValue: null,
  });
  private readonly groupsCache = toSignal(this.store.select(identityAccessFeature.selectGroups), {
    initialValue: null,
  });

  readonly rows = computed(() => this.usersPage()?.rows ?? []);
  readonly totalCount = computed(() => this.usersPage()?.total ?? 0);
  readonly types = computed(() => this.groupsCache() ?? []);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly safePageIndex = computed(() => this.usersPage()?.pageIndex ?? this.pageIndex());
  readonly canPrev = computed(() => this.safePageIndex() > 0);
  readonly canNext = computed(() => this.safePageIndex() < this.totalPages() - 1);

  readonly draftGroups = computed(() => {
    const typeId = this.draftTypeId();
    const types = this.types();
    if (typeId == null) {
      return types.flatMap((t) => t.Groups ?? []);
    }
    return types.find((t) => t.Id === typeId)?.Groups ?? [];
  });

  /** System (admin organization) groups only — used when creating users from this page. */
  readonly adminGroups = computed(() => {
    const system = this.types().find(
      (t) => (t.Code ?? '').localeCompare(SYSTEM_USER_TYPE_CODE, undefined, { sensitivity: 'accent' }) === 0
    );
    return (system?.Groups ?? []).filter((g) => g.IsActive !== false);
  });

  readonly advancedFilterCount = computed(() => {
    let count = 0;
    if (this.query().trim()) count += 1;
    if (this.typeId() != null) count += 1;
    if (this.groupId() != null) count += 1;
    if (this.activeFilter() !== 'all') count += 1;
    return count;
  });

  readonly hasActiveFilters = computed(
    () =>
      !!this.query().trim() ||
      !!this.draftQuery().trim() ||
      this.typeId() != null ||
      this.draftTypeId() != null ||
      this.groupId() != null ||
      this.draftGroupId() != null ||
      this.activeFilter() !== 'all' ||
      this.draftActive() !== 'all'
  );

  readonly pageFooterLabel = computed(() => {
    const total = this.totalCount();
    if (total === 0) {
      return $localize`:@@jobseeker.jobsList.pagerEmpty:Showing 0 of 0`;
    }
    const start = this.safePageIndex() * this.pageSize() + 1;
    const end = Math.min(total, (this.safePageIndex() + 1) * this.pageSize());
    return `${$localize`:@@jobseeker.common.showing:Showing`} ${start}-${end} ${$localize`:@@jobseeker.common.of:of`} ${total}`;
  });

  readonly na = $localize`:@@jobseeker.common.na:—`;
  readonly searchLabel = $localize`:@@jobseeker.identityAccess.search:Search`;
  readonly yesLabel = $localize`:@@jobseeker.common.yes:Yes`;
  readonly noLabel = $localize`:@@jobseeker.common.no:No`;
  readonly rowActionsMenuAria = $localize`:@@jobseeker.admin.systemConfig.rowActionsMenu:Row actions`;
  readonly addUserLabel = $localize`:@@jobseeker.identityAccess.addUser:Add user`;
  readonly editUserLabel = $localize`:@@jobseeker.identityAccess.editUser:Edit`;
  readonly removeAccountLabel = $localize`:@@jobseeker.identityAccess.removeAccount:Remove`;
  readonly advancedFiltersLabel = $localize`:@@jobseeker.jobSeekersList.tabAdvanced:Advanced filter`;
  readonly clearFiltersAria = $localize`:@@jobseeker.jobSeekerSearch.clearFilters:Clear filters`;
  readonly backToDashboardAria = $localize`:@@jobseeker.identityAccess.usersBackAria:Back to dashboard`;
  readonly editName = this.editForm.controls.name;
  readonly editEmail = this.editForm.controls.email;
  readonly createName = this.createForm.controls.name;
  readonly createEmail = this.createForm.controls.email;
  readonly createPassword = this.createForm.controls.password;
  readonly createGroup = this.createForm.controls.userGroupId;

  constructor() {
    const onDocClick = (event: MouseEvent): void => {
      if (this.actionsMenuRowId() == null) return;
      const el = event.target as HTMLElement | null;
      if (!el?.closest?.('[data-row-actions-menu]')) {
        this.actionsMenuRowId.set(null);
      }
    };
    document.addEventListener('click', onDocClick, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
  }

  ngOnInit(): void {
    void this.loadCatalog();
    void this.reload();
  }

  typeLabel(row: Pick<IdentityAccessUserTypeDto, 'NameEn' | 'NameAr'> | null | undefined): string {
    if (!row) {
      return this.na;
    }
    return (this.locale.locale() === 'ar' ? row.NameAr : row.NameEn) || this.na;
  }

  groupLabel(row: Pick<IdentityAccessUserGroupDto, 'NameEn' | 'NameAr'> | null | undefined): string {
    if (!row) {
      return this.na;
    }
    return (this.locale.locale() === 'ar' ? row.NameAr : row.NameEn) || this.na;
  }

  userName(row: IdentityAccessUserRowDto): string {
    const value = this.locale.locale() === 'ar' ? row.NameAr || row.NameEn : row.NameEn || row.NameAr;
    return value?.trim() || this.na;
  }

  userTypeLabel(row: IdentityAccessUserRowDto): string {
    return this.typeLabel({ NameEn: row.UserTypeNameEn ?? '', NameAr: row.UserTypeNameAr ?? '' });
  }

  userGroupLabel(row: IdentityAccessUserRowDto): string {
    return this.groupLabel({ NameEn: row.UserGroupNameEn ?? '', NameAr: row.UserGroupNameAr ?? '' });
  }

  onDraftQuery(value: string): void {
    this.draftQuery.set(value ?? '');
  }

  onDraftType(value: string): void {
    const id = value ? Number(value) : null;
    this.draftTypeId.set(id && id > 0 ? id : null);
    const groups = this.draftGroups();
    if (this.draftGroupId() != null && !groups.some((g) => g.Id === this.draftGroupId())) {
      this.draftGroupId.set(null);
    }
  }

  onDraftGroup(value: string): void {
    const id = value ? Number(value) : null;
    this.draftGroupId.set(id && id > 0 ? id : null);
  }

  onDraftActive(value: string): void {
    if (value === 'active' || value === 'inactive') {
      this.draftActive.set(value);
      return;
    }
    this.draftActive.set('all');
  }

  search(): void {
    this.closeRowActionsMenu();
    this.query.set(this.draftQuery().trim());
    this.typeId.set(this.draftTypeId());
    this.groupId.set(this.draftGroupId());
    this.activeFilter.set(this.draftActive());
    this.pageIndex.set(0);
    this.drawerOpen.set(false);
    void this.reload();
  }

  openDrawer(): void {
    this.closeRowActionsMenu();
    this.draftQuery.set(this.query());
    this.draftTypeId.set(this.typeId());
    this.draftGroupId.set(this.groupId());
    this.draftActive.set(this.activeFilter());
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  applyDrawer(): void {
    this.search();
  }

  clearDrawerFilters(): void {
    this.draftQuery.set('');
    this.draftTypeId.set(null);
    this.draftGroupId.set(null);
    this.draftActive.set('all');
  }

  clearFilters(): void {
    this.closeRowActionsMenu();
    this.draftQuery.set('');
    this.draftTypeId.set(null);
    this.draftGroupId.set(null);
    this.draftActive.set('all');
    this.query.set('');
    this.typeId.set(null);
    this.groupId.set(null);
    this.activeFilter.set('all');
    this.pageIndex.set(0);
    this.drawerOpen.set(false);
    void this.reload();
  }

  openAddFromHeader(): void {
    this.closeRowActionsMenu();
    this.editingUser.set(null);
    this.createUserOpen.set(true);
    this.createForm.reset({ name: '', email: '', password: '', userGroupId: 0 });
  }

  setPageSize(size: number): void {
    this.closeRowActionsMenu();
    const next = PAGE_SIZE_OPTIONS.includes(size as PageSize) ? (size as PageSize) : 5;
    this.pageSize.set(next);
    this.pageIndex.set(0);
    void this.reload();
  }

  prevPage(): void {
    if (!this.canPrev()) {
      return;
    }
    this.closeRowActionsMenu();
    this.pageIndex.update((p) => p - 1);
    void this.reload();
  }

  nextPage(): void {
    if (!this.canNext()) {
      return;
    }
    this.closeRowActionsMenu();
    this.pageIndex.update((p) => p + 1);
    void this.reload();
  }

  toggleRowActionsMenu(rowId: string, event: Event): void {
    event.stopPropagation();
    this.actionsMenuRowId.update((current) => (current === rowId ? null : rowId));
  }

  closeRowActionsMenu(): void {
    this.actionsMenuRowId.set(null);
  }

  openEditUser(row: IdentityAccessUserRowDto): void {
    this.closeRowActionsMenu();
    this.createUserOpen.set(false);
    this.editingUser.set(row);
    const name =
      (this.locale.locale() === 'ar' ? row.NameAr || row.NameEn : row.NameEn || row.NameAr)?.trim() || '';
    this.editForm.reset({
      name,
      email: row.Email ?? '',
      isActive: row.IsActive,
    });
  }

  closeEditUser(): void {
    this.editingUser.set(null);
  }

  closeCreateUser(): void {
    this.createUserOpen.set(false);
    this.createForm.reset({ name: '', email: '', password: '', userGroupId: 0 });
  }

  async saveCreateUser(): Promise<void> {
    const result = await this.formPipeline.run({
      form: this.createForm,
      work: () => {
        const raw = this.createForm.getRawValue();
        return firstValueFrom(
          this.api.createAdminUser({
            Name: (raw.name ?? '').trim(),
            Email: (raw.email ?? '').trim(),
            Password: raw.password ?? '',
            UserGroupId: Number(raw.userGroupId),
          })
        );
      },
      execute: {
        successMessage: $localize`:@@jobseeker.identityAccess.userCreated:User created`,
      },
    });

    if (result.ok) {
      this.closeCreateUser();
      await this.reload();
    }
  }

  async saveEditUser(): Promise<void> {
    const row = this.editingUser();
    if (!row?.Id) {
      return;
    }

    const result = await this.formPipeline.run({
      form: this.editForm,
      work: () => {
        const raw = this.editForm.getRawValue();
        return firstValueFrom(
          this.api.updateAdminUser(row.Id, {
            Name: (raw.name ?? '').trim(),
            Email: (raw.email ?? '').trim(),
            IsActive: !!raw.isActive,
          })
        );
      },
      execute: {
        successMessage: $localize`:@@jobseeker.identityAccess.userUpdated:User updated`,
      },
    });

    if (result.ok) {
      this.closeEditUser();
      await this.reload();
    }
  }

  async removeAccount(row: IdentityAccessUserRowDto): Promise<void> {
    this.closeRowActionsMenu();
    if (!row.CanRemove) {
      return;
    }
    const ok = window.confirm(
      $localize`:@@jobseeker.identityAccess.removeAccountConfirm:Remove this account from the profile?`
    );
    if (!ok) {
      return;
    }
    await this.asyncExec.execute(
      () => firstValueFrom(this.api.removeAccount(row.Id)),
      {
        successMessage: $localize`:@@jobseeker.identityAccess.accountRemoved:Account removed`,
      }
    );
    await this.reload();
  }

  private async loadCatalog(): Promise<void> {
    try {
      await firstValueFrom(this.api.getGroups());
    } catch {
      this.loadError.set($localize`:@@jobseeker.identityAccess.loadError:Could not load users.`);
    }
  }

  private async reload(): Promise<void> {
    this.listLoadState.set('loading');
    this.loadError.set(null);
    try {
      await this.asyncExec.execute(
        async () => {
          const active = this.activeFilter();
          await firstValueFrom(
            this.api.getUsersPage({
              pageIndex: this.pageIndex(),
              pageSize: this.pageSize(),
              q: this.query(),
              userTypeId: this.typeId(),
              userGroupId: this.groupId(),
              isActive: active === 'all' ? null : active === 'active',
            })
          );
        },
        {
          recordSuccess: false,
          progressMessage: $localize`:@@jobseeker.common.loading:Loading…`,
        }
      );
      this.listLoadState.set('ready');
    } catch {
      this.loadError.set($localize`:@@jobseeker.identityAccess.loadError:Could not load users.`);
      this.listLoadState.set('error');
    }
  }
}
