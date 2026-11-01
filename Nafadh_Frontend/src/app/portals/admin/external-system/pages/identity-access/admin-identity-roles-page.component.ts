/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { IdentityAccessApiService } from '../../legacy/core/api/services/identity-access-api.service';
import type {
  IdentityAccessRoleRowDto,
  IdentityAccessUserGroupDto,
  IdentityAccessUserTypeDto,
} from '../../legacy/core/api/models/identity-access.models';
import { PAGE_SIZE_OPTIONS, type PageSize } from '../../legacy/core/api/models/paged-list.models';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { identityAccessFeature } from '../../legacy/core/store/identity-access/identity-access.reducer';
import { AssetUrlPipe } from '../../legacy/core/ui/asset-url.pipe';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { BackArrowButtonComponent } from '../../legacy/core/ui/back-arrow-button/back-arrow-button.component';

export type IdentityRolesListMode = 'custom' | 'template';

@Component({
  selector: 'app-admin-identity-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    AssetUrlPipe,
    BackArrowButtonComponent,
  ],
  templateUrl: './admin-identity-roles-page.component.html',
  styleUrl: './admin-identity-roles-page.component.scss',
})
export class AdminIdentityRolesPageComponent implements OnInit {
  readonly homePath = '/admin/dashboard';
  private readonly api = inject(IdentityAccessApiService);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly locale = inject(LocaleService);

  readonly mode: IdentityRolesListMode =
    this.route.snapshot.data['rolesMode'] === 'template' ? 'template' : 'custom';
  readonly isTemplateMode = this.mode === 'template';

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly draftQuery = signal('');
  readonly query = signal('');
  readonly draftTypeId = signal<number | null>(null);
  readonly typeId = signal<number | null>(null);
  readonly draftGroupId = signal<number | null>(null);
  readonly groupId = signal<number | null>(null);
  readonly listLoadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal<string | null>(null);
  readonly actionsMenuRowId = signal<string | null>(null);
  readonly drawerOpen = signal(false);

  private readonly rolesPage = toSignal(this.store.select(identityAccessFeature.selectRolesPage), {
    initialValue: null,
  });
  private readonly templateRolesPage = toSignal(
    this.store.select(identityAccessFeature.selectTemplateRolesPage),
    { initialValue: null }
  );
  private readonly groupsCache = toSignal(this.store.select(identityAccessFeature.selectGroups), {
    initialValue: null,
  });

  private readonly activePage = computed(() =>
    this.isTemplateMode ? this.templateRolesPage() : this.rolesPage()
  );

  readonly rows = computed(() => this.activePage()?.rows ?? []);
  readonly totalCount = computed(() => this.activePage()?.total ?? 0);
  readonly types = computed(() => this.groupsCache() ?? []);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly safePageIndex = computed(() => this.activePage()?.pageIndex ?? this.pageIndex());
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

  readonly advancedFilterCount = computed(() => {
    let count = 0;
    if (this.query().trim()) count += 1;
    if (this.typeId() != null) count += 1;
    if (this.groupId() != null) count += 1;
    return count;
  });

  readonly hasActiveFilters = computed(
    () =>
      !!this.query().trim() ||
      !!this.draftQuery().trim() ||
      this.typeId() != null ||
      this.draftTypeId() != null ||
      this.groupId() != null ||
      this.draftGroupId() != null
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
  readonly rowActionsMenuAria = $localize`:@@jobseeker.admin.systemConfig.rowActionsMenu:Row actions`;
  readonly editPagesLabel = $localize`:@@jobseeker.identityAccess.editPages:Pages`;
  readonly deleteLabel = $localize`:@@jobseeker.common.delete:Delete`;
  readonly createRoleLabel = $localize`:@@jobseeker.identityAccess.createRole:Create role`;
  readonly advancedFiltersLabel = $localize`:@@jobseeker.jobSeekersList.tabAdvanced:Advanced filter`;
  readonly clearFiltersAria = $localize`:@@jobseeker.jobSeekerSearch.clearFilters:Clear filters`;
  readonly backToDashboardAria = $localize`:@@jobseeker.identityAccess.rolesBackAria:Back to dashboard`;
  readonly pageTitle = this.isTemplateMode
    ? $localize`:@@jobseeker.identityAccess.templateRolesTitle:Template roles`
    : $localize`:@@jobseeker.identityAccess.customRolesTitle:Custom roles`;

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

  roleTypeLabel(row: IdentityAccessRoleRowDto): string {
    return this.typeLabel({ NameEn: row.UserTypeNameEn ?? '', NameAr: row.UserTypeNameAr ?? '' });
  }

  roleGroupLabel(row: IdentityAccessRoleRowDto): string {
    return this.groupLabel({ NameEn: row.UserGroupNameEn ?? '', NameAr: row.UserGroupNameAr ?? '' });
  }

  roleDisplayName(row: IdentityAccessRoleRowDto): string {
    const display = this.locale.locale() === 'ar' ? row.DisplayNameAr : row.DisplayNameEn;
    if (display) {
      return display;
    }
    if (row.IsTemplate) {
      return this.roleGroupLabel(row);
    }
    return row.Name || this.na;
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

  search(): void {
    this.closeRowActionsMenu();
    this.query.set(this.draftQuery().trim());
    this.typeId.set(this.draftTypeId());
    this.groupId.set(this.draftGroupId());
    this.pageIndex.set(0);
    this.drawerOpen.set(false);
    void this.reload();
  }

  openDrawer(): void {
    this.closeRowActionsMenu();
    this.draftQuery.set(this.query());
    this.draftTypeId.set(this.typeId());
    this.draftGroupId.set(this.groupId());
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
  }

  clearFilters(): void {
    this.closeRowActionsMenu();
    this.draftQuery.set('');
    this.draftTypeId.set(null);
    this.draftGroupId.set(null);
    this.query.set('');
    this.typeId.set(null);
    this.groupId.set(null);
    this.pageIndex.set(0);
    this.drawerOpen.set(false);
    void this.reload();
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

  openPages(row: IdentityAccessRoleRowDto): void {
    this.closeRowActionsMenu();
    void this.router.navigate(['/admin/external-system/identity/roles/pages'], {
      state: {
        roleId: row.Id,
        source: this.isTemplateMode ? 'template-roles' : 'roles',
      },
    });
  }

  roleKind(row: IdentityAccessRoleRowDto): string {
    if (row.IsLocked) {
      return $localize`:@@jobseeker.identityAccess.kindLocked:Locked`;
    }
    return row.IsTemplate
      ? $localize`:@@jobseeker.identityAccess.kindTemplate:Template`
      : $localize`:@@jobseeker.identityAccess.kindCustom:Custom`;
  }

  goToCreate(): void {
    this.closeRowActionsMenu();
    void this.router.navigate(['/admin/external-system/identity/roles/create']);
  }

  async deleteRole(row: IdentityAccessRoleRowDto): Promise<void> {
    this.closeRowActionsMenu();
    if (!row.CanDelete) {
      return;
    }
    const ok = window.confirm($localize`:@@jobseeker.identityAccess.deleteRoleConfirm:Delete this role?`);
    if (!ok) {
      return;
    }
    await this.asyncExec.execute(() => firstValueFrom(this.api.deleteRole(row.Id)), {
      successMessage: $localize`:@@jobseeker.identityAccess.roleDeleted:Role deleted`,
    });
    await this.reload();
  }

  private async loadCatalog(): Promise<void> {
    try {
      await firstValueFrom(this.api.getGroups());
    } catch {
      /* catalog is optional for the list */
    }
  }

  private async reload(): Promise<void> {
    this.listLoadState.set('loading');
    this.loadError.set(null);
    try {
      await this.asyncExec.execute(
        async () => {
          await firstValueFrom(
            this.api.getRolesPage({
              pageIndex: this.pageIndex(),
              pageSize: this.pageSize(),
              q: this.query(),
              userTypeId: this.typeId(),
              userGroupId: this.groupId(),
              templatesOnly: this.isTemplateMode,
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
      this.loadError.set($localize`:@@jobseeker.identityAccess.rolesLoadError:Could not load roles.`);
      this.listLoadState.set('error');
    }
  }
}
