/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import type {
  IdentityAccessAppPageDto,
  IdentityAccessPageGrantDto,
  IdentityAccessUserGroupDto,
  IdentityAccessUserTypeDto,
} from '../../legacy/core/api/models/identity-access.models';
import { PAGE_ACTION_FLAGS, PAGE_DATA_SCOPES } from '../../legacy/core/api/models/identity-access.models';
import { IdentityAccessApiService } from '../../legacy/core/api/services/identity-access-api.service';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { identityAccessFeature } from '../../legacy/core/store/identity-access/identity-access.reducer';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { BackArrowButtonComponent } from '../../legacy/core/ui/back-arrow-button/back-arrow-button.component';

interface PageSystemGroup {
  systemCode: string;
  pages: IdentityAccessAppPageDto[];
}

export interface RolePagesNavState {
  roleId?: string;
  groupId?: number;
  source?: 'groups' | 'roles' | 'template-roles';
}

@Component({
  selector: 'app-admin-identity-group-pages-page',
  standalone: true,
  imports: [CommonModule, BackArrowButtonComponent],
  templateUrl: './admin-identity-group-pages-page.component.html',
  styleUrl: './admin-identity-group-pages-page.component.scss',
})
export class AdminIdentityGroupPagesPageComponent implements OnInit {
  private readonly api = inject(IdentityAccessApiService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly asyncExec = inject(AsyncExecutorService);
  readonly locale = inject(LocaleService);

  readonly actionFlags = PAGE_ACTION_FLAGS;
  readonly dataScopes = PAGE_DATA_SCOPES;
  readonly na = $localize`:@@jobseeker.common.na:—`;

  /** Captured in constructor — `getCurrentNavigation()` is null by `ngOnInit`. */
  private readonly navState: RolePagesNavState;

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal<string | null>(null);
  readonly group = signal<IdentityAccessUserGroupDto | null>(null);
  readonly groupType = signal<IdentityAccessUserTypeDto | null>(null);
  readonly roleId = signal<string | null>(null);
  readonly roleName = signal('');
  readonly source = signal<'groups' | 'roles' | 'template-roles'>('groups');
  readonly selectedPageIds = signal<Set<number>>(new Set());
  readonly pageGrants = signal<Record<number, IdentityAccessPageGrantDto>>({});
  readonly rolePagesCatalog = signal<IdentityAccessAppPageDto[]>([]);

  private readonly groupsCache = toSignal(this.store.select(identityAccessFeature.selectGroups), {
    initialValue: null,
  });

  readonly types = computed(() => this.groupsCache() ?? []);

  readonly backToList = computed(() => {
    const src = this.source();
    if (src === 'roles') {
      return '/admin/external-system/identity/roles';
    }
    if (src === 'template-roles') {
      return '/admin/external-system/identity/template-roles';
    }
    return '/admin/external-system/identity/groups';
  });

  readonly backToListAria = computed(() => {
    const src = this.source();
    if (src === 'roles' || src === 'template-roles') {
      return $localize`:@@jobseeker.identityAccess.rolesBackToListAria:Back to roles`;
    }
    return $localize`:@@jobseeker.identityAccess.groupsBackToListAria:Back to groups`;
  });

  readonly pageTitle = computed(() => {
    const src = this.source();
    if (src === 'roles' || src === 'template-roles') {
      return this.roleName() || $localize`:@@jobseeker.identityAccess.editPages:Pages`;
    }
    const row = this.group();
    if (!row) {
      return $localize`:@@jobseeker.identityAccess.editPages:Pages`;
    }
    return this.locale.locale() === 'ar' ? row.NameAr || row.NameEn : row.NameEn || row.NameAr;
  });

  readonly pageGroups = computed((): PageSystemGroup[] => {
    const pages = this.rolePagesCatalog();
    const bySystem = new Map<string, IdentityAccessAppPageDto[]>();
    for (const page of pages) {
      const key = page.SystemCode || 'Other';
      const list = bySystem.get(key) ?? [];
      list.push(page);
      bySystem.set(key, list);
    }
    return Array.from(bySystem.entries()).map(([systemCode, groupPages]) => ({
      systemCode,
      pages: groupPages,
    }));
  });

  constructor() {
    const fromNav = this.router.getCurrentNavigation()?.extras.state as RolePagesNavState | undefined;
    const fromHistory =
      typeof history !== 'undefined' ? (history.state as RolePagesNavState | null) : null;
    this.navState = {
      roleId: (fromNav?.roleId ?? fromHistory?.roleId ?? '').toString() || undefined,
      groupId: Number(fromNav?.groupId ?? fromHistory?.groupId) || undefined,
      source: fromNav?.source ?? fromHistory?.source,
    };
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  pageName(page: IdentityAccessAppPageDto): string {
    return (this.locale.locale() === 'ar' ? page.NameAr : page.NameEn) || page.Code;
  }

  isPageSelected(pageId: number): boolean {
    return this.selectedPageIds().has(pageId);
  }

  togglePage(pageId: number, checked: boolean): void {
    this.selectedPageIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(pageId);
      } else {
        next.delete(pageId);
      }
      return next;
    });
    this.pageGrants.update((current) => {
      const next = { ...current };
      if (checked) {
        const page = this.rolePagesCatalog().find((item) => item.Id === pageId);
        next[pageId] = {
          AppPageId: pageId,
          ActionFlags: page?.RequiredActionFlags || PAGE_ACTION_FLAGS.View,
          DataScope: page?.DefaultDataScope || 'mine',
        };
      } else {
        delete next[pageId];
      }
      return next;
    });
  }

  hasAction(pageId: number, flag: number): boolean {
    return ((this.pageGrants()[pageId]?.ActionFlags ?? 0) & flag) === flag;
  }

  /** Claim checkboxes stay visible but only mutate when the page itself is selected. */
  claimsEnabled(pageId: number): boolean {
    return this.isPageSelected(pageId);
  }

  toggleAction(pageId: number, flag: number, checked: boolean): void {
    if (!this.claimsEnabled(pageId)) {
      return;
    }
    this.pageGrants.update((current) => {
      const grant = current[pageId] ?? {
        AppPageId: pageId,
        ActionFlags: PAGE_ACTION_FLAGS.View,
        DataScope: 'mine',
      };
      const flags = checked ? grant.ActionFlags | flag : grant.ActionFlags & ~flag;
      return {
        ...current,
        [pageId]: { ...grant, ActionFlags: flags || PAGE_ACTION_FLAGS.View },
      };
    });
  }

  setScope(pageId: number, scope: string): void {
    if (!this.claimsEnabled(pageId)) {
      return;
    }
    this.pageGrants.update((current) => {
      const grant = current[pageId] ?? {
        AppPageId: pageId,
        ActionFlags: PAGE_ACTION_FLAGS.View,
        DataScope: 'mine',
      };
      return { ...current, [pageId]: { ...grant, DataScope: scope } };
    });
  }

  toggleSystem(systemCode: string, checked: boolean): void {
    const group = this.pageGroups().find((g) => g.systemCode === systemCode);
    if (!group) {
      return;
    }
    for (const page of group.pages) {
      this.togglePage(page.Id, checked);
    }
  }

  systemChecked(systemCode: string): boolean {
    const group = this.pageGroups().find((g) => g.systemCode === systemCode);
    if (!group || group.pages.length === 0) {
      return false;
    }
    return group.pages.every((page) => this.selectedPageIds().has(page.Id));
  }

  async save(): Promise<void> {
    const roleId = this.roleId();
    if (!roleId) {
      return;
    }
    await this.asyncExec.execute(
      () =>
        firstValueFrom(
          this.api.updateRolePages(roleId, {
            PageIds: Array.from(this.selectedPageIds()),
            Grants: Object.values(this.pageGrants()).filter((grant) =>
              this.selectedPageIds().has(grant.AppPageId)
            ),
          })
        ),
      {
        successMessage: $localize`:@@jobseeker.identityAccess.pagesSaved:Pages updated`,
      }
    );
    await this.router.navigateByUrl(this.backToList());
  }

  cancel(): void {
    void this.router.navigateByUrl(this.backToList());
  }

  private localizedGroupName(row: IdentityAccessUserGroupDto): string {
    return this.locale.locale() === 'ar' ? row.NameAr || row.NameEn : row.NameEn || row.NameAr;
  }

  private async load(): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);

    const roleIdFromNav = (this.navState.roleId ?? '').trim();
    const groupIdFromNav = Number(this.navState.groupId);
    const source =
      this.navState.source ??
      (roleIdFromNav && !groupIdFromNav ? 'roles' : 'groups');
    this.source.set(source);

    if (!roleIdFromNav && !(Number.isFinite(groupIdFromNav) && groupIdFromNav > 0)) {
      this.loadError.set(
        source === 'roles'
          ? $localize`:@@jobseeker.identityAccess.pagesLoadError:Could not load role pages.`
          : $localize`:@@jobseeker.identityAccess.groupNotFound:Group not found.`
      );
      this.loadState.set('error');
      return;
    }

    try {
      await this.asyncExec.execute(
        async () => {
          let roleId = roleIdFromNav || null;
          let roleName = '';

          if (!roleId) {
            await firstValueFrom(this.api.getGroups(true));

            let found: IdentityAccessUserGroupDto | null = null;
            let foundType: IdentityAccessUserTypeDto | null = null;
            for (const type of this.types()) {
              const match = (type.Groups ?? []).find((g) => g.Id === groupIdFromNav);
              if (match) {
                found = match;
                foundType = type;
                break;
              }
            }

            if (!found || !foundType) {
              throw new Error('group-not-found');
            }

            this.group.set(found);
            this.groupType.set(foundType);

            roleId = found.TemplateRoleId ?? null;
            roleName =
              (this.locale.locale() === 'ar'
                ? found.TemplateRoleNameAr || found.NameAr
                : found.TemplateRoleNameEn || found.NameEn) || '';
            if (!roleId) {
              const page = await firstValueFrom(
                this.api.getRolesPage({
                  pageIndex: 0,
                  pageSize: 15,
                  userGroupId: found.Id,
                  templatesOnly: true,
                  cache: false,
                })
              );
              const template = (page.rows ?? [])[0];
              roleId = template?.Id ?? null;
              roleName =
                (this.locale.locale() === 'ar'
                  ? template?.DisplayNameAr || template?.UserGroupNameAr
                  : template?.DisplayNameEn || template?.UserGroupNameEn) ||
                template?.Name ||
                '';
            }

            if (!roleId) {
              throw new Error('template-missing');
            }

            this.roleName.set(roleName || this.localizedGroupName(found));
          }

          this.roleId.set(roleId);

          const data = await firstValueFrom(this.api.getRolePages(roleId));
          if (!this.roleName()) {
            const localized =
              this.locale.locale() === 'ar' ? data.RoleNameAr || data.RoleNameEn : data.RoleNameEn || data.RoleNameAr;
            this.roleName.set(localized || data.RoleName || roleId);
          }
          this.rolePagesCatalog.set(data.Pages ?? []);
          this.selectedPageIds.set(new Set(data.SelectedPageIds ?? []));
          const grants: Record<number, IdentityAccessPageGrantDto> = {};
          for (const grant of data.Grants ?? []) {
            grants[grant.AppPageId] = grant;
          }
          this.pageGrants.set(grants);
        },
        {
          recordSuccess: false,
          progressMessage: $localize`:@@jobseeker.common.loading:Loading…`,
        }
      );
      this.loadState.set('ready');
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'template-missing'
          ? $localize`:@@jobseeker.identityAccess.groupTemplateMissing:No template role found for this group.`
          : err instanceof Error && err.message === 'group-not-found'
            ? $localize`:@@jobseeker.identityAccess.groupNotFound:Group not found.`
            : $localize`:@@jobseeker.identityAccess.pagesLoadError:Could not load role pages.`;
      this.loadError.set(message);
      this.loadState.set('error');
    }
  }
}
