/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { IdentityAccessApiService } from '../../legacy/core/api/services/identity-access-api.service';
import type {
  IdentityAccessUserGroupDto,
  IdentityAccessUserTypeDto,
} from '../../legacy/core/api/models/identity-access.models';
import { PAGE_SIZE_OPTIONS, type PageSize } from '../../legacy/core/api/models/paged-list.models';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { identityAccessFeature } from '../../legacy/core/store/identity-access/identity-access.reducer';
import { AssetUrlPipe } from '../../legacy/core/ui/asset-url.pipe';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { BackArrowButtonComponent } from '../../legacy/core/ui/back-arrow-button/back-arrow-button.component';

interface GroupRow {
  type: IdentityAccessUserTypeDto;
  group: IdentityAccessUserGroupDto;
}

@Component({
  selector: 'app-admin-identity-groups-page',
  standalone: true,
  imports: [
    CommonModule,
    AssetUrlPipe,
    BackArrowButtonComponent,
  ],
  templateUrl: './admin-identity-groups-page.component.html',
  styleUrl: './admin-identity-groups-page.component.scss',
})
export class AdminIdentityGroupsPageComponent implements OnInit {
  readonly homePath = '/admin/dashboard';
  private readonly api = inject(IdentityAccessApiService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly locale = inject(LocaleService);

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly draftQuery = signal('');
  readonly query = signal('');
  readonly draftTypeId = signal<number | null>(null);
  readonly typeId = signal<number | null>(null);
  readonly draftActive = signal<'all' | 'active' | 'inactive'>('all');
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly listLoadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal<string | null>(null);
  readonly actionsMenuRowId = signal<number | null>(null);
  readonly drawerOpen = signal(false);

  private readonly groupsCache = toSignal(this.store.select(identityAccessFeature.selectGroups), {
    initialValue: null,
  });

  readonly types = computed(() => this.groupsCache() ?? []);
  readonly allRows = computed((): GroupRow[] => {
    const list: GroupRow[] = [];
    for (const type of this.types()) {
      for (const group of type.Groups ?? []) {
        list.push({ type, group });
      }
    }
    return list;
  });

  readonly rows = computed((): GroupRow[] => {
    const q = this.query().trim().toLowerCase();
    const typeId = this.typeId();
    const active = this.activeFilter();
    return this.allRows().filter((row) => {
      if (typeId != null && row.type.Id !== typeId) {
        return false;
      }
      if (active === 'active' && row.group.IsActive === false) {
        return false;
      }
      if (active === 'inactive' && row.group.IsActive !== false) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [
        row.group.Code,
        row.group.NameEn,
        row.group.NameAr,
        row.group.TemplateRoleNameEn ?? '',
        row.group.TemplateRoleNameAr ?? '',
        row.group.TemplateRoleName ?? '',
        row.type.Code,
        row.type.NameEn,
        row.type.NameAr,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly totalCount = computed(() => this.rows().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly safePageIndex = computed(() => Math.min(this.pageIndex(), Math.max(0, this.totalPages() - 1)));
  readonly pagedRows = computed(() => {
    const size = this.pageSize();
    const start = this.safePageIndex() * size;
    return this.rows().slice(start, start + size);
  });
  readonly canPrev = computed(() => this.safePageIndex() > 0);
  readonly canNext = computed(() => this.safePageIndex() < this.totalPages() - 1);

  readonly advancedFilterCount = computed(() => {
    let count = 0;
    if (this.query().trim()) count += 1;
    if (this.typeId() != null) count += 1;
    if (this.activeFilter() !== 'all') count += 1;
    return count;
  });

  readonly hasActiveFilters = computed(
    () =>
      !!this.query().trim() ||
      !!this.draftQuery().trim() ||
      this.typeId() != null ||
      this.draftTypeId() != null ||
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
  readonly rowActionsMenuAria = $localize`:@@jobseeker.admin.systemConfig.rowActionsMenu:Row actions`;
  readonly editPagesLabel = $localize`:@@jobseeker.identityAccess.editPages:Pages`;
  readonly editLabel = $localize`:@@jobseeker.common.edit:Edit`;
  readonly deactivateLabel = $localize`:@@jobseeker.identityAccess.deactivate:Deactivate`;
  readonly createGroupLabel = $localize`:@@jobseeker.identityAccess.createGroup:Create group`;
  readonly advancedFiltersLabel = $localize`:@@jobseeker.jobSeekersList.tabAdvanced:Advanced filter`;
  readonly clearFiltersAria = $localize`:@@jobseeker.jobSeekerSearch.clearFilters:Clear filters`;
  readonly backToDashboardAria = $localize`:@@jobseeker.identityAccess.groupsBackAria:Back to dashboard`;

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
    void this.reload();
  }

  typeLabel(row: IdentityAccessUserTypeDto): string {
    return (this.locale.locale() === 'ar' ? row.NameAr : row.NameEn) || this.na;
  }

  groupLabel(row: IdentityAccessUserGroupDto): string {
    return (this.locale.locale() === 'ar' ? row.NameAr : row.NameEn) || this.na;
  }

  templateRoleLabel(row: IdentityAccessUserGroupDto): string {
    const display =
      this.locale.locale() === 'ar'
        ? row.TemplateRoleNameAr || row.NameAr
        : row.TemplateRoleNameEn || row.NameEn;
    return display || this.na;
  }

  onDraftQuery(value: string): void {
    this.draftQuery.set(value ?? '');
  }

  onDraftType(value: string): void {
    const id = value ? Number(value) : null;
    this.draftTypeId.set(id && id > 0 ? id : null);
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
    this.activeFilter.set(this.draftActive());
    this.pageIndex.set(0);
    this.drawerOpen.set(false);
  }

  openDrawer(): void {
    this.closeRowActionsMenu();
    this.draftQuery.set(this.query());
    this.draftTypeId.set(this.typeId());
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
    this.draftActive.set('all');
  }

  clearFilters(): void {
    this.closeRowActionsMenu();
    this.draftQuery.set('');
    this.draftTypeId.set(null);
    this.draftActive.set('all');
    this.query.set('');
    this.typeId.set(null);
    this.activeFilter.set('all');
    this.pageIndex.set(0);
    this.drawerOpen.set(false);
  }

  setPageSize(size: number): void {
    this.closeRowActionsMenu();
    const next = PAGE_SIZE_OPTIONS.includes(size as PageSize) ? (size as PageSize) : 5;
    this.pageSize.set(next);
    this.pageIndex.set(0);
  }

  prevPage(): void {
    if (this.canPrev()) {
      this.closeRowActionsMenu();
      this.pageIndex.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.canNext()) {
      this.closeRowActionsMenu();
      this.pageIndex.update((p) => p + 1);
    }
  }

  toggleRowActionsMenu(rowId: number, event: Event): void {
    event.stopPropagation();
    this.actionsMenuRowId.update((current) => (current === rowId ? null : rowId));
  }

  closeRowActionsMenu(): void {
    this.actionsMenuRowId.set(null);
  }

  goToCreate(): void {
    this.closeRowActionsMenu();
    void this.router.navigate(['/admin/external-system/identity/groups/create']);
  }

  openEdit(row: GroupRow): void {
    this.closeRowActionsMenu();
    void this.router.navigate(['/admin/external-system/identity/groups/edit'], { state: { groupId: row.group.Id } });
  }

  openPages(row: GroupRow): void {
    this.closeRowActionsMenu();
    void this.router.navigate(['/admin/external-system/identity/groups/pages'], {
      state: { groupId: row.group.Id, source: 'groups' },
    });
  }

  async deactivate(row: GroupRow): Promise<void> {
    this.closeRowActionsMenu();
    if (!row.group.CanDeactivate) {
      return;
    }
    const ok = window.confirm($localize`:@@jobseeker.identityAccess.deactivateGroupConfirm:Deactivate this group?`);
    if (!ok) {
      return;
    }
    await this.asyncExec.execute(() => firstValueFrom(this.api.deactivateGroup(row.group.Id)), {
      successMessage: $localize`:@@jobseeker.identityAccess.groupDeactivated:Group deactivated`,
    });
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.listLoadState.set('loading');
    this.loadError.set(null);
    try {
      await this.asyncExec.execute(
        () => firstValueFrom(this.api.getGroups(true)),
        {
          recordSuccess: false,
          progressMessage: $localize`:@@jobseeker.common.loading:Loading…`,
        }
      );
      this.listLoadState.set('ready');
    } catch {
      this.loadError.set($localize`:@@jobseeker.identityAccess.groupsLoadError:Could not load groups.`);
      this.listLoadState.set('error');
    }
  }
}
