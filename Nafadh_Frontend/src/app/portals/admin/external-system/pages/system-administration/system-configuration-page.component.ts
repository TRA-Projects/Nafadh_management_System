/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { AdminSystemApiService, type SystemVariableDto } from '../../legacy/core/api/services/admin-system-api.service';
import { SYSTEM_VARIABLE_CODES } from '../../legacy/core/auth/platform-auth.constants';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import {
  isToggleSystemVariable,
  isYnStringSystemVariable,
  systemVariableDescription,
  systemVariableName,
  ynEnabledFromValue,
  ynValueFromEnabled,
} from '../../legacy/core/profile/system-variable-display.util';
import { adminSystemActions } from '../../legacy/core/store/admin-system/admin-system.actions';
import { adminSystemFeature } from '../../legacy/core/store/admin-system/admin-system.reducer';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { ModalCloseButtonComponent } from '../../legacy/core/ui/modal-close-button/modal-close-button.component';
import { AssetUrlPipe } from '../../legacy/core/ui/asset-url.pipe';
import { educationDegreeRanksCount } from '../../legacy/core/system/education-degree-ranks.util';
import { NAFATH_VALIDITY_CHECK_CODES, parseNafathValidityCheck } from '../../legacy/core/system/nafath-validity-check.util';
import { EducationDegreeRanksEditorComponent } from './education-degree-ranks-editor.component';

const PAGE_SIZE_OPTIONS = [5, 10, 15] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

@Component({
  selector: 'app-system-configuration-page',
  standalone: true,
  imports: [AssetUrlPipe, CommonModule, ReactiveFormsModule, ModalCloseButtonComponent, EducationDegreeRanksEditorComponent],
  templateUrl: './system-configuration-page.component.html',
  styleUrl: './system-configuration-page.component.scss',
})
export class SystemConfigurationPageComponent implements OnInit {
  private readonly api = inject(AdminSystemApiService);
  private readonly fb = inject(FormBuilder);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly locale = inject(LocaleService);

  readonly searchQuery = signal('');
  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly modalOpen = signal(false);
  readonly editing = signal<SystemVariableDto | null>(null);
  readonly actionsMenuRowId = signal<string | null>(null);

  readonly rowActionsMenuAria = $localize`:@@jobseeker.admin.systemConfig.rowActionsMenu:Row actions`;

  private readonly pageCache = toSignal(this.store.select(adminSystemFeature.selectSystemVariablesPage), {
    initialValue: null,
  });

  readonly rows = computed(() => this.pageCache()?.rows ?? []);
  readonly totalCount = computed(() => this.pageCache()?.total ?? 0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly safePageIndex = computed(() => this.pageCache()?.pageIndex ?? this.pageIndex());
  readonly canPrev = computed(() => this.safePageIndex() > 0);
  readonly canNext = computed(() => this.safePageIndex() < this.totalPages() - 1);

  readonly pageFooterLabel = computed(() => {
    const total = this.totalCount();
    if (total === 0) {
      return $localize`:@@jobseeker.jobsList.pagerEmpty:Showing 0 of 0`;
    }
    const start = this.safePageIndex() * this.pageSize() + 1;
    const end = Math.min(total, (this.safePageIndex() + 1) * this.pageSize());
    return `${$localize`:@@jobseeker.common.showing:Showing`} ${start}-${end} ${$localize`:@@jobseeker.common.of:of`} ${total}`;
  });

  readonly valueForm = this.fb.nonNullable.group({
    ValueText: [''],
    ValueBool: [false],
    ValueInt: [0, Validators.required],
    ValueYn: [false],
  });

  readonly isToggleSystemVariable = isToggleSystemVariable;
  readonly ynEnabledFromValue = ynEnabledFromValue;
  private readonly ranksEditor = viewChild(EducationDegreeRanksEditorComponent);

  constructor() {
    const onDocClick = (event: MouseEvent): void => {
      if (this.actionsMenuRowId() == null) {
        return;
      }
      const target = event.target as Node | null;
      if (!target || !this.host.nativeElement.contains(target)) {
        this.actionsMenuRowId.set(null);
        return;
      }
      const el = target as HTMLElement;
      if (!el.closest?.('[data-row-actions-menu]')) {
        this.actionsMenuRowId.set(null);
      }
    };
    document.addEventListener('click', onDocClick, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
  }

  variableName(row: SystemVariableDto): string {
    return systemVariableName(row, this.locale.locale());
  }

  variableDescription(row: SystemVariableDto): string {
    return systemVariableDescription(row, this.locale.locale());
  }

  isMultilineSystemVariable(row: SystemVariableDto): boolean {
    const key = row.Code || row.VariableKey;
    return (
      key === SYSTEM_VARIABLE_CODES.JOB_APPLICATION_UNDERTAKING_EN ||
      key === SYSTEM_VARIABLE_CODES.JOB_APPLICATION_UNDERTAKING_AR
    );
  }

  isEducationDegreeRanksVariable(row: SystemVariableDto): boolean {
    const key = row.Code || row.VariableKey;
    return key === SYSTEM_VARIABLE_CODES.EDUCATION_DEGREE_RANKS;
  }

  isNafathValidityCheckVariable(row: SystemVariableDto): boolean {
    const key = row.Code || row.VariableKey;
    return key === SYSTEM_VARIABLE_CODES.NAFATH_VALIDITY_CHECK;
  }

  readonly validityCheckCodes = NAFATH_VALIDITY_CHECK_CODES;

  validityCheckLabel(code: string | null | undefined): string {
    switch (parseNafathValidityCheck(code)) {
      case 'NONE':
        return $localize`:@@jobseeker.admin.systemConfig.validity.none:No validity check`;
      case 'EXPIRY_DATE':
        return $localize`:@@jobseeker.admin.systemConfig.validity.expiryDate:Expiry date only`;
      case 'ACTIVE_FLAG':
        return $localize`:@@jobseeker.admin.systemConfig.validity.activeFlag:Active flag only`;
      default:
        return $localize`:@@jobseeker.admin.systemConfig.validity.both:Active flag and expiry date`;
    }
  }

  ranksEditorJson(row: SystemVariableDto): string {
    return String(row.Value ?? '');
  }

  displayValue(row: SystemVariableDto): string {
    if (this.isNafathValidityCheckVariable(row)) {
      return this.validityCheckLabel(String(row.Value ?? ''));
    }
    if (!this.isEducationDegreeRanksVariable(row)) {
      return String(row.Value ?? '');
    }
    const count = educationDegreeRanksCount(String(row.Value ?? ''));
    if (count == null) {
      return $localize`:@@jobseeker.admin.systemConfig.degreeRanks.invalidJson:Could not load ranks.`;
    }
    if (count === 1) {
      return $localize`:@@jobseeker.admin.systemConfig.degreeRanks.countOne:1 rank`;
    }
    return $localize`:@@jobseeker.admin.systemConfig.degreeRanks.countMany:${count}:COUNT: ranks`;
  }

  ngOnInit(): void {
    void this.reload();
  }

  toggleRowActionsMenu(rowCode: string, event: Event): void {
    event.stopPropagation();
    this.actionsMenuRowId.update((current) => (current === rowCode ? null : rowCode));
  }

  closeRowActionsMenu(): void {
    this.actionsMenuRowId.set(null);
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set((value ?? '').toString());
    this.pageIndex.set(0);
    void this.reload();
  }

  setPageSize(size: number): void {
    if (!PAGE_SIZE_OPTIONS.includes(size as PageSize)) {
      return;
    }
    this.pageSize.set(size as PageSize);
    this.pageIndex.set(0);
    void this.reload();
  }

  nextPage(): void {
    if (!this.canNext()) {
      return;
    }
    this.pageIndex.set(this.safePageIndex() + 1);
    void this.reload();
  }

  prevPage(): void {
    if (!this.canPrev()) {
      return;
    }
    this.pageIndex.set(this.safePageIndex() - 1);
    void this.reload();
  }

  async reload(): Promise<void> {
    const q = this.searchQuery().trim();
    try {
      await this.asyncExec.execute(
        () =>
          firstValueFrom(
            this.api.getSystemVariablesPage({
              pageIndex: this.pageIndex(),
              pageSize: this.pageSize(),
              q: q || undefined,
            })
          ),
        {
          recordSuccess: false,
          progressMessage: $localize`:@@jobseeker.admin.systemConfig.loadingProgress:Loading system configurationâ€¦`,
        }
      );
    } catch {
      // Drop stale NgRx rows so a dead API does not keep showing the last successful page.
      this.store.dispatch(
        adminSystemActions.cacheSystemVariablesPage({
          page: { rows: [], total: 0, pageIndex: 0, pageSize: this.pageSize() },
        })
      );
    }
  }

  openEdit(row: SystemVariableDto): void {
    this.editing.set(row);
    if (isToggleSystemVariable(row)) {
      this.valueForm.patchValue({
        ValueYn: ynEnabledFromValue(row.Value),
        ValueText: '',
        ValueInt: 0,
        ValueBool: false,
      });
    } else if (row.ValueType === 'Integer') {
      this.valueForm.patchValue({
        ValueInt: Number(row.Value),
        ValueText: '',
        ValueBool: false,
        ValueYn: false,
      });
    } else if (row.ValueType === 'Time') {
      const raw = String(row.Value ?? '').trim();
      const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
      const hm = m
        ? `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`
        : '';
      this.valueForm.patchValue({
        ValueText: hm,
        ValueInt: 0,
        ValueBool: false,
        ValueYn: false,
      });
    } else if (this.isEducationDegreeRanksVariable(row) || this.isNafathValidityCheckVariable(row)) {
      this.valueForm.patchValue({
        ValueText: this.isNafathValidityCheckVariable(row)
          ? parseNafathValidityCheck(String(row.Value ?? ''))
          : '',
        ValueInt: 0,
        ValueBool: false,
        ValueYn: false,
      });
    } else {
      this.valueForm.patchValue({
        ValueText: String(row.Value ?? ''),
        ValueInt: 0,
        ValueBool: false,
        ValueYn: false,
      });
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editing.set(null);
  }

  async save(): Promise<void> {
    const row = this.editing();
    if (!row) {
      return;
    }
    let next: string | number | boolean = row.Value as string | number | boolean;
    if (this.isEducationDegreeRanksVariable(row)) {
      const editor = this.ranksEditor();
      if (!editor?.isValid()) {
        return;
      }
      next = editor.serialize();
    } else if (this.isNafathValidityCheckVariable(row)) {
      next = parseNafathValidityCheck(this.valueForm.controls.ValueText.value);
    } else if (row.ValueType === 'Boolean') {
      next = this.valueForm.controls.ValueYn.value;
    } else if (isYnStringSystemVariable(row)) {
      next = ynValueFromEnabled(this.valueForm.controls.ValueYn.value);
    } else if (row.ValueType === 'Integer') {
      next = this.valueForm.controls.ValueInt.value;
    } else {
      next = this.valueForm.controls.ValueText.value;
    }

    await this.saveVariableValue(row, next);
  }

  private async saveVariableValue(row: SystemVariableDto, next: string | number | boolean): Promise<void> {
    const key = row.Code || row.VariableKey;
    await this.asyncExec.execute(() => firstValueFrom(this.api.updateSystemVariable(key, next)), {
      successMessage: $localize`:@@jobseeker.admin.systemConfig.valueSaved:Value saved`,
    });
    this.closeModal();
    await this.reload();
  }
}

