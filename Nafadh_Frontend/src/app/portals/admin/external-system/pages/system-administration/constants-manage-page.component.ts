/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { AdminSystemApiService, type SystemConfigGroupDto, type SystemConfigValueDto } from '../../legacy/core/api/services/admin-system-api.service';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { SYSTEM_CONFIG_CODES } from '../../legacy/core/profile/system-config-codes';
import { MANAGEMENT_SYSTEM_LOOKUP_TYPES } from '../../legacy/core/profile/management-system-config-codes';
import { getArabicConfigGroupLabel } from '../../legacy/core/profile/arabic-system-config-labels';
import {
  isSubConfigCode,
  mainConfigCodesWithSubCatalog,
  mainConfigHasSubCatalog,
  subConfigCodeForMain,
} from '../../legacy/core/profile/system-config-sub-codes.util';
import { adminSystemActions } from '../../legacy/core/store/admin-system/admin-system.actions';
import { adminSystemFeature } from '../../legacy/core/store/admin-system/admin-system.reducer';
import type { AdminSystemConfigValueCache } from '../../legacy/core/store/admin-system/admin-system.state';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { FormPipelineService } from '../../legacy/core/ui/form-pipeline.service';
import { isFormPipelineSuccess } from '../../legacy/core/ui/form-pipeline.types';
import {
  FormPageTabsComponent,
  type FormPageTabItem,
} from '../../legacy/core/ui/form-page-tabs/form-page-tabs.component';
import { ModalCloseButtonComponent } from '../../legacy/core/ui/modal-close-button/modal-close-button.component';
import { AssetUrlPipe } from '../../legacy/core/ui/asset-url.pipe';
import {
  SearchableMultiSelectComponent,
  type SearchableMultiSelectOption,
} from '../../legacy/core/ui/searchable-multi-select/searchable-multi-select.component';
import { AngularValidators, ValidationMessagePipe } from '../../legacy/core/validators';

const PAGE_SIZE_OPTIONS = [5, 10, 15] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
type ConstantsTab = 'main' | 'sub';

interface LookupTypeOption {
  code: string;
  label: string;
}

type ConstantFormControlName = 'code' | 'label_en' | 'label_ar' | 'IsActive' | 'subReasonDropdown' | 'parentReasonId';

@Component({
  selector: 'app-constants-manage-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalCloseButtonComponent,
    SearchableMultiSelectComponent,
    ValidationMessagePipe,
    AssetUrlPipe,
    FormPageTabsComponent,
  ],
  templateUrl: './constants-manage-page.component.html',
styleUrl: './constants-manage-page.component.scss',
})
export class ConstantsManagePageComponent {
  private readonly api = inject(AdminSystemApiService);
  private readonly locale = inject(LocaleService);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly fb = inject(FormBuilder);
  private readonly formPipeline = inject(FormPipelineService);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  // Emergency-only catalogue for when the Training groups endpoint is unavailable.
  private readonly fallbackLookupTypes: LookupTypeOption[] = [
    ...MANAGEMENT_SYSTEM_LOOKUP_TYPES.map((item) => ({
      code: item.code,
      label: item.labelAr,
    })),
    { code: SYSTEM_CONFIG_CODES.QUALIFICATION_DEGREES, label: $localize`:@@jobseeker.admin.constants.lookup.qualificationDegrees:Qualification degrees` },
    { code: SYSTEM_CONFIG_CODES.NATIONALITY, label: $localize`:@@jobseeker.admin.constants.lookup.nationalities:Nationalities` },
    { code: SYSTEM_CONFIG_CODES.PRIMARY_SPECIFICATION, label: $localize`:@@jobseeker.admin.constants.lookup.primarySpecifications:Primary specifications` },
    { code: SYSTEM_CONFIG_CODES.FIELD_OF_STUDY, label: $localize`:@@jobseeker.admin.constants.lookup.fieldOfStudy:Fields of study` },
    {
      code: SYSTEM_CONFIG_CODES.EDUCATIONAL_INSTITUTION,
      label: $localize`:@@jobseeker.admin.constants.lookup.educationalInstitutions:Educational institutions`,
    },
    { code: SYSTEM_CONFIG_CODES.EDUCATION_LEVEL, label: $localize`:@@jobseeker.admin.constants.lookup.educationLevels:Education levels` },
    { code: SYSTEM_CONFIG_CODES.TRAINING_PROGRAM_TYPE, label: $localize`:@@jobseeker.admin.constants.lookup.trainingProgramTypes:Training program types` },
    { code: SYSTEM_CONFIG_CODES.CERTIFICATE_NAME, label: $localize`:@@jobseeker.admin.constants.lookup.certificateNames:Professional certification names` },
    { code: SYSTEM_CONFIG_CODES.TRAINING_PROVIDER, label: $localize`:@@jobseeker.admin.constants.lookup.trainingProviders:Training providers` },
    { code: SYSTEM_CONFIG_CODES.APPLICATION_METHOD, label: $localize`:@@jobseeker.admin.constants.lookup.applicationMethods:Application methods` },
    { code: SYSTEM_CONFIG_CODES.OPPORTUNITY_TYPE, label: $localize`:@@jobseeker.admin.constants.lookup.opportunityTypes:Opportunity types` },
    {
      code: SYSTEM_CONFIG_CODES.JOB_CATEGORY,
      label: $localize`:@@jobseeker.admin.constants.lookup.opportunityField:Opportunity field / Work scope`,
    },
    { code: SYSTEM_CONFIG_CODES.WORK_MODE, label: $localize`:@@jobseeker.admin.constants.lookup.workModes:Work modes` },
    { code: SYSTEM_CONFIG_CODES.TARGET_GENDER, label: $localize`:@@jobseeker.admin.constants.lookup.targetGenders:Target genders` },
    { code: SYSTEM_CONFIG_CODES.INTERVIEW_MODE, label: $localize`:@@jobseeker.admin.constants.lookup.interviewModes:Interview modes` },
    { code: SYSTEM_CONFIG_CODES.TARGET_APPLICANT, label: $localize`:@@jobseeker.admin.constants.lookup.targetApplicants:Target applicants` },
    { code: SYSTEM_CONFIG_CODES.SALARY_DISPLAY, label: $localize`:@@jobseeker.admin.constants.lookup.salaryDisplays:Total wage display options` },
    { code: SYSTEM_CONFIG_CODES.CURRENCY, label: $localize`:@@jobseeker.admin.constants.lookup.currencies:Currencies` },
    { code: SYSTEM_CONFIG_CODES.PAY_FREQUENCY, label: $localize`:@@jobseeker.admin.constants.lookup.payFrequencies:Pay frequencies` },
    { code: SYSTEM_CONFIG_CODES.CONTRACT_TYPE, label: $localize`:@@jobseeker.admin.constants.lookup.contractTypes:Contract types` },
    {
      code: SYSTEM_CONFIG_CODES.OFFER_REJECTION_REASON,
      label: $localize`:@@jobseeker.admin.constants.lookup.offerRejectionReasons:Offer rejection reasons`,
    },
    {
      code: SYSTEM_CONFIG_CODES.ASK_TO_APPLY_REJECTION_REASON,
      label: $localize`:@@jobseeker.admin.constants.lookup.askToApplyRejectionReasons:Ask-to-apply rejection reasons`,
    },
    {
      code: SYSTEM_CONFIG_CODES.WITHDRAWAL_REASON_CATEGORY,
      label: $localize`:@@jobseeker.admin.constants.lookup.withdrawalReasonCategories:Withdrawal reason categories`,
    },
    { code: SYSTEM_CONFIG_CODES.BENEFIT, label: $localize`:@@jobseeker.admin.constants.lookup.benefits:Benefits` },
    { code: SYSTEM_CONFIG_CODES.ALLOWANCE, label: $localize`:@@jobseeker.admin.constants.lookup.allowances:Allowances` },
    { code: SYSTEM_CONFIG_CODES.LANGUAGE, label: $localize`:@@jobseeker.admin.constants.lookup.languages:Languages` },
    {
      code: SYSTEM_CONFIG_CODES.REQUIRED_DOCUMENT_FILE_TYPE,
      label: $localize`:@@jobseeker.admin.constants.lookup.requiredDocumentFileTypes:Required document file types`,
    },
    {
      code: SYSTEM_CONFIG_CODES.INTERVIEW_REJECTION_REASON,
      label: $localize`:@@jobseeker.admin.constants.lookup.interviewRejectionReasons:Interview rejection reasons`,
    },
    {
      code: SYSTEM_CONFIG_CODES.INTERVIEW_NO_SHOW_REASON,
      label: $localize`:@@jobseeker.admin.constants.lookup.interviewNoShowReasons:Interview no-show reasons`,
    },
    {
      code: SYSTEM_CONFIG_CODES.INTERVIEW_RESCHEDULE_REASON,
      label: $localize`:@@jobseeker.admin.constants.lookup.interviewRescheduleReasons:Interview reschedule reasons`,
    },
    {
      code: SYSTEM_CONFIG_CODES.OFFER_ENTITY,
      label: $localize`:@@jobseeker.admin.constants.lookup.offerEntities:Offer entities`,
    },
    {
      code: SYSTEM_CONFIG_CODES.ASSESSMENT_OFFER_REJECTION_REASON,
      label: $localize`:@@jobseeker.admin.constants.lookup.assessmentOfferRejectionReasons:Assessment offer rejection reasons`,
    },
    {
      code: SYSTEM_CONFIG_CODES.BEHAVIOR,
      label: $localize`:@@jobseeker.admin.constants.lookup.behaviors:Behaviors`,
    },
  ].map((item) => ({ ...item, label: getArabicConfigGroupLabel(item.code, item.label) }));

  /** Source of truth: SystemConfigGroups in Nafadh Training, not the TypeScript enum list. */
  readonly catalogGroups = signal<SystemConfigGroupDto[]>([]);
  readonly catalogLoading = signal(true);
  readonly catalogLoadFailed = signal(false);
  readonly allLookupTypes = computed<LookupTypeOption[]>(() => {
    if (this.catalogLoadFailed()) return this.fallbackLookupTypes;
    return this.catalogGroups().map((group) => ({
      code: group.code,
      label: getArabicConfigGroupLabel(group.code, group.label_ar, group.label_en),
    }));
  });

  readonly activeTab = signal<ConstantsTab>('main');
  readonly pageTabs: FormPageTabItem[] = [
    { id: 'main', label: $localize`:@@jobseeker.admin.constants.tabMain:Main constants` },
    { id: 'sub', label: $localize`:@@jobseeker.admin.constants.tabSub:Sub constants` },
  ];

  readonly mainLookupTypes = computed(() => this.allLookupTypes().filter((option) => !isSubConfigCode(option.code)));
  readonly subMainLookupTypes = computed(() =>
    this.allLookupTypes().filter((option) => (mainConfigCodesWithSubCatalog() as string[]).includes(option.code))
  );

  readonly selectedMainLookupCode = signal('');
  readonly selectedSubMainLookupCode = signal('');
  readonly selectedSubParentReasonId = signal<string>('');

  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | number | null>(null);
  readonly subParentReasonRows = signal<SystemConfigValueDto[]>([]);
  readonly actionsMenuRowId = signal<string | null>(null);

  readonly rowActionsMenuAria = $localize`:@@jobseeker.admin.constants.rowActionsMenu:Row actions`;

  readonly selectedLookupCode = computed(() => {
    if (this.activeTab() === 'sub') {
      return subConfigCodeForMain(this.selectedSubMainLookupCode()) ?? '';
    }
    return this.selectedMainLookupCode();
  });

  readonly isMainGroupWithSubCatalog = computed(
    () => this.activeTab() === 'main' && mainConfigHasSubCatalog(this.selectedLookupCode())
  );

  readonly subParentReasonSelectOptions = computed<SearchableMultiSelectOption[]>(() =>
    this.subParentReasonRows().map((row) => ({
      id: row.id,
      label: this.locale.locale() === 'ar' ? row.label_ar || row.label_en : row.label_en || row.label_ar,
    }))
  );

  readonly selectedSubParentReasonValues = computed<Array<number | string>>(() => {
    const v = this.selectedSubParentReasonId();
    return v ? [v] : [];
  });

  readonly showSubCatalogColumn = computed(() => this.isMainGroupWithSubCatalog());
  readonly showParentReasonColumn = computed(() => false);

  readonly yesLabel = $localize`:@@jobseeker.common.yes:Yes`;
  readonly noLabel = $localize`:@@jobseeker.common.no:No`;
  readonly hasSubCatalogLabel = $localize`:@@jobseeker.admin.constants.hasSubCatalog:Linked sub-menu`;
  readonly parentMainValueLabel = $localize`:@@jobseeker.admin.constants.parentMainValue:Parent main value`;
  readonly parentMainValuePlaceholder = $localize`:@@jobseeker.admin.constants.parentMainValuePlaceholder:Select parent main value…`;
  readonly lookupTypeAria = $localize`:@@jobseeker.admin.constants.lookupTypeAria:Select constants group`;
  readonly lookupGroupPlaceholder = $localize`:@@jobseeker.admin.constants.lookupGroupPlaceholder:Select constants group…`;
  readonly lookupSearchPlaceholder = $localize`:@@jobseeker.admin.constants.lookupSearchPlaceholder:Search constants group…`;
  readonly lookupEmptyText = $localize`:@@jobseeker.admin.constants.lookupEmpty:No matching group`;
  readonly lookupSelectOptions = computed<SearchableMultiSelectOption[]>(() =>
    (this.activeTab() === 'main' ? this.mainLookupTypes() : this.subMainLookupTypes()).map((option) => ({
      id: option.code,
      label: option.label,
    }))
  );

  readonly selectedLookupValues = computed<Array<number | string>>(() => {
    const code = this.activeTab() === 'main' ? this.selectedMainLookupCode() : this.selectedSubMainLookupCode();
    return code ? [code] : [];
  });

  // UI guard mirrors the Training Backend's NFD_* write protection.
  readonly isReadOnlyManagementGroup = computed(() => {
    const code = this.selectedLookupCode();
    return code.startsWith('NFD_') || this.catalogGroups().some((group) => group.code === code && group.IsReadOnly);
  });

  readonly canEditSelectedGroup = computed(() =>
    !!this.selectedLookupCode() && !this.catalogLoading() && !this.catalogLoadFailed() && !this.isReadOnlyManagementGroup()
  );

  readonly canManageSubRows = computed(() => {
    if (this.catalogLoading() || this.catalogLoadFailed() || this.isReadOnlyManagementGroup()) return false;
    if (this.activeTab() === 'main') {
      return !!this.selectedMainLookupCode().trim();
    }
    return !!this.selectedSubMainLookupCode().trim() && !!this.selectedSubParentReasonId().trim();
  });

  private readonly configValuesByCode = toSignal(this.store.select(adminSystemFeature.selectConfigValuesByCode), {
    initialValue: {} as Record<string, AdminSystemConfigValueCache | undefined>,
  });

  readonly selectedCache = computed(() => this.configValuesByCode()[this.selectedLookupCode()] ?? null);
  readonly rows = computed(() => this.selectedCache()?.rows ?? []);
  readonly totalCount = computed(() => this.selectedCache()?.total ?? 0);
  readonly safePageIndex = computed(() => this.selectedCache()?.pageIndex ?? this.pageIndex());
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly canPrev = computed(() => this.safePageIndex() > 0);
  readonly canNext = computed(() => this.safePageIndex() < this.totalPages() - 1);

  readonly selectedLookupLabel = computed(() => {
    const code = this.activeTab() === 'main' ? this.selectedMainLookupCode() : this.selectedSubMainLookupCode();
    const mainLabel = this.allLookupTypes().find((option) => option.code === code)?.label ?? code;
    if (this.activeTab() === 'sub') {
      return $localize`:@@jobseeker.admin.constants.subCatalogForMain:Sub constants — ${mainLabel}:MAIN:`;
    }
    return mainLabel;
  });

  readonly pageFooterLabel = computed(() => {
    const total = this.totalCount();
    if (total === 0) {
      return $localize`:@@jobseeker.jobsList.pagerEmpty:Showing 0 of 0`;
    }
    const start = this.safePageIndex() * this.pageSize() + 1;
    const end = Math.min(total, (this.safePageIndex() + 1) * this.pageSize());
    return `${$localize`:@@jobseeker.common.showing:Showing`} ${start}-${end} ${$localize`:@@jobseeker.common.of:of`} ${total}`;
  });

  readonly form = this.fb.nonNullable.group({
    code: [
      '',
      [
        AngularValidators.required,
        AngularValidators.minLength(3),
        AngularValidators.maxLength(3),
        AngularValidators.pattern(/^[A-Z]{3}$/),
      ],
    ],
    label_en: ['', [AngularValidators.required, AngularValidators.maxLength(200)]],
    label_ar: ['', [AngularValidators.required, AngularValidators.maxLength(200)]],
    IsActive: [true],
    subReasonDropdown: [false],
    parentReasonId: [''],
  });

  readonly codePlaceholder = $localize`:@@jobseeker.admin.constants.codePlaceholder:e.g. FLT`;

  constructor() {
    void this.loadCatalogGroups();
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

  /** Refresh without changing the selected group; fall back read-only on API errors. */
  async loadCatalogGroups(): Promise<void> {
    this.catalogLoading.set(true);
    this.catalogLoadFailed.set(false);
    try {
      const groups = await firstValueFrom(this.api.getConfigGroups());
      if (!Array.isArray(groups)) throw new Error('Invalid Training catalogue response');
      this.catalogGroups.set(groups);
      const available = new Set(groups.map((group) => group.code));
      if (this.selectedMainLookupCode() && !available.has(this.selectedMainLookupCode())) {
        this.selectedMainLookupCode.set('');
      }
      if (this.selectedSubMainLookupCode() && !available.has(this.selectedSubMainLookupCode())) {
        this.selectedSubMainLookupCode.set('');
        this.selectedSubParentReasonId.set('');
      }
    } catch {
      // Allow the menu to remain discoverable, but do not offer write actions
      // when we cannot confirm the server's current group catalogue.
      this.catalogLoadFailed.set(true);
    } finally {
      this.catalogLoading.set(false);
    }
  }

  rowActionKey(row: SystemConfigValueDto): string {
    return String(row.id);
  }

  rowTitle(row: SystemConfigValueDto): string {
    return this.locale.locale() === 'ar' ? row.label_ar || row.label_en : row.label_en || row.label_ar;
  }

  toggleRowActionsMenu(rowKey: string, event: Event): void {
    event.stopPropagation();
    this.actionsMenuRowId.update((current) => (current === rowKey ? null : rowKey));
  }

  closeRowActionsMenu(): void {
    this.actionsMenuRowId.set(null);
  }

  setTab(tab: ConstantsTab | string): void {
    const next = tab === 'sub' ? 'sub' : 'main';
    if (this.activeTab() === next) {
      return;
    }
    this.activeTab.set(next);
    this.pageIndex.set(0);
    this.closeRowActionsMenu();
    if (next === 'sub') {
      void this.reloadSubParentOptions();
    }
    void this.reload();
  }

  onSubParentReasonSelectionChange(values: Array<number | string>): void {
    const next = values[0];
    const nextId = next != null ? String(next) : '';
    if (nextId === this.selectedSubParentReasonId()) {
      return;
    }
    this.selectedSubParentReasonId.set(nextId);
    this.pageIndex.set(0);
    if (nextId.trim()) {
      void this.reload();
    }
  }

  private async reloadSubParentOptions(): Promise<void> {
    const mainCode = this.selectedSubMainLookupCode().trim();
    if (!mainCode) {
      this.subParentReasonRows.set([]);
      this.selectedSubParentReasonId.set('');
      return;
    }
    const rows = await firstValueFrom(this.api.getValues(mainCode, true));
    this.subParentReasonRows.set(rows);
    const current = this.selectedSubParentReasonId();
    if (current && !rows.some((row) => String(row.id) === current)) {
      this.selectedSubParentReasonId.set('');
    }
  }

  isRequired(controlName: ConstantFormControlName): boolean {
    return this.form.controls[controlName].hasValidator(AngularValidators.required);
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const next = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (input.value !== next) {
      input.value = next;
    }
    this.form.controls.code.setValue(next);
  }

  setLookupType(code: string): void {
    const options = this.activeTab() === 'main' ? this.mainLookupTypes() : this.subMainLookupTypes();
    if (!options.some((option) => option.code === code)) {
      return;
    }
    if (this.activeTab() === 'main') {
      if (this.selectedMainLookupCode() === code) {
        return;
      }
      this.selectedMainLookupCode.set(code);
    } else {
      if (this.selectedSubMainLookupCode() === code) {
        return;
      }
      this.selectedSubMainLookupCode.set(code);
      void this.reloadSubParentOptions().then(() => this.reload());
      return;
    }
    this.pageIndex.set(0);
    void this.reload();
  }

  onLookupSelectionChange(values: Array<number | string>): void {
    const next = values[0];
    if (next == null) {
      if (this.activeTab() === 'main') {
        this.selectedMainLookupCode.set('');
      } else {
        this.selectedSubMainLookupCode.set('');
        this.selectedSubParentReasonId.set('');
        this.subParentReasonRows.set([]);
      }
      this.pageIndex.set(0);
      return;
    }
    this.setLookupType(String(next));
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
    const lookupCode = this.selectedLookupCode().trim();
    if (!lookupCode) {
      return;
    }
    if (this.activeTab() === 'sub' && !this.selectedSubParentReasonId().trim()) {
      return;
    }

    const parentFilter = this.activeTab() === 'sub' ? this.selectedSubParentReasonId() : undefined;

    await this.asyncExec.execute(
      () =>
        firstValueFrom(
          this.api.getConfigValuesPage(lookupCode, this.pageIndex(), this.pageSize(), parentFilter, true)
        ),
      {
        recordSuccess: false,
        progressMessage: $localize`:@@jobseeker.admin.constants.loadingProgress:Loading constants…`,
      }
    );
  }

  openAdd(): void {
    if (!this.canManageSubRows()) {
      return;
    }
    this.editingId.set(null);
    if (this.activeTab() === 'sub') {
      this.form.controls.code.clearValidators();
      this.form.controls.code.disable();
    } else {
      this.form.controls.code.setValidators([
        AngularValidators.required,
        AngularValidators.minLength(3),
        AngularValidators.maxLength(3),
        AngularValidators.pattern(/^[A-Z]{3}$/),
      ]);
      this.form.controls.code.enable();
    }
    this.form.controls.code.updateValueAndValidity();
    this.form.reset({
      code: '',
      label_en: '',
      label_ar: '',
      IsActive: true,
      subReasonDropdown: false,
      parentReasonId: this.activeTab() === 'sub' ? this.selectedSubParentReasonId() : '',
    });
    this.modalOpen.set(true);
  }

  openEdit(row: SystemConfigValueDto): void {
    if (this.catalogLoading() || this.catalogLoadFailed() || this.isReadOnlyManagementGroup()) return;
    this.editingId.set(row.id);
    this.form.reset({
      code: row.code ?? String(row.id),
      label_en: row.label_en,
      label_ar: row.label_ar,
      IsActive: row.IsActive ?? true,
      subReasonDropdown: row.subReasonDropdown ?? false,
      parentReasonId: row.parentReasonId != null ? String(row.parentReasonId) : '',
    });
    this.form.controls.code.disable();
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  async save(): Promise<void> {
    if (this.catalogLoading() || this.catalogLoadFailed() || this.isReadOnlyManagementGroup()) return;
    const id = this.editingId();
    const isSubTab = this.activeTab() === 'sub';
    const result = await this.formPipeline.run({
      form: this.form,
      work: async () => {
        const raw = this.form.getRawValue();
        const labels = {
          label_en: raw.label_en.trim(),
          label_ar: raw.label_ar.trim(),
          IsActive: !!raw.IsActive,
        };
        if (isSubTab) {
          const parentReasonId = this.selectedSubParentReasonId().trim() || null;
          if (id == null) {
            return firstValueFrom(
              this.api.ensureConfigValue(this.selectedLookupCode(), {
                ...labels,
                parentReasonId,
              })
            );
          }
          return firstValueFrom(
            this.api.updateConfigValue(this.selectedLookupCode(), id, {
              ...labels,
              parentReasonId,
            })
          );
        }
        const extras = {
          subReasonDropdown: this.isMainGroupWithSubCatalog() ? !!raw.subReasonDropdown : undefined,
        };
        if (id == null) {
          return firstValueFrom(
            this.api.createConfigValue(this.selectedLookupCode(), {
              code: raw.code.trim(),
              ...labels,
              ...extras,
            })
          );
        }
        return firstValueFrom(this.api.updateConfigValue(this.selectedLookupCode(), id, { ...labels, ...extras }));
      },
      execute: {
        successMessage: $localize`:@@jobseeker.common.saved:Saved`,
      },
    });

    if (!isFormPipelineSuccess(result)) {
      return;
    }
    const saved = result.value;
    this.closeModal();
    await this.reload();
    if (saved?.IsActive === false) {
      const code = this.selectedLookupCode().trim();
      if (code) {
        this.store.dispatch(adminSystemActions.configValueUpserted({ code, row: saved }));
      }
    }
  }
}
