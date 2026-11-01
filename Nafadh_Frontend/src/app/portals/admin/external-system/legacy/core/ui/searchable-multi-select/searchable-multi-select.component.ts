/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { AdminSystemApiService, SkillKind } from '../../api/services/admin-system-api.service';
import { uiAsyncActions } from '../../store/ui-async/ui-async.actions';
import { LocaleService } from '../../locale/locale.service';
import { configValuePersistedSelectId } from '../../profile/work-scope.util';
import {
  addCustomRowLabel,
  configDraftFromTypedLabel,
  findExactCatalogOptionMatch,
  isNewMultiSelectTempId,
  labelFromNewMultiSelectTempId,
  newMultiSelectTempId,
  taxonomyDraftFromTypedLabel,
  type CustomPersistMode,
} from './searchable-multi-select-custom.util';

export interface SearchableMultiSelectOption {
  id: number | string;
  label: string;
  /** When true, the option cannot be toggled (e.g. already used elsewhere). */
  disabled?: boolean;
  /** Styled as a typed value not yet in the catalog. */
  isNew?: boolean;
}

@Component({
  selector: 'app-searchable-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-multi-select.component.html',
  styleUrl: './searchable-multi-select.component.scss',
  host: {
    '[class.searchable-multi-select--open]': 'open',
  },
})
export class SearchableMultiSelectComponent {
  private static nextRadioGroupId = 0;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly adminApi = inject(AdminSystemApiService);
  private readonly locale = inject(LocaleService);
  private readonly store = inject(Store);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Capture phase so outside-click still works inside drawers/modals that
    // call stopPropagation on their panel (bubble never reaches document).
    const onDocClick = (event: Event) => this.onDocumentClick(event);
    document.addEventListener('click', onDocClick, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
  }

  /** Stable `name` for radio inputs when {@link mode} is `single`. */
  readonly radioGroupName = `app-searchable-multi-select-${SearchableMultiSelectComponent.nextRadioGroupId++}`;

  readonly newSuggestionBadge = $localize`:@@jobseeker.searchableMultiSelect.newBadge:New`;

  @Input() label = '';
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyText = 'No options found';
  @Input() options: SearchableMultiSelectOption[] = [];
  @Input() selectedValues: Array<number | string> = [];
  @Input() required = false;
  /** `single` keeps at most one value (e.g. opportunity picker). */
  @Input() mode: 'multi' | 'single' = 'multi';
  /** When true, the control is read-only (no open, no remove). */
  @Input() controlDisabled = false;
  /** When true, show an "add typed value" row when search has no exact catalog match. */
  @Input() allowAddCustom = false;
  /** Config group code for {@link ensureConfigValue} when persisting custom config values. */
  @Input() configCode?: string;
  /** Explicit persist mode; `config` requires {@link configCode}. */
  @Input() customPersist: CustomPersistMode | null = null;

  @Output() selectedValuesChange = new EventEmitter<Array<number | string>>();
  @Output() selectionChange = new EventEmitter<Array<number | string>>();

  /** Ephemeral options for custom / not-yet-in-catalog selections. */
  private readonly extraOptions: SearchableMultiSelectOption[] = [];

  search = '';
  open = false;
  /** Open above the control when there is not enough space below (avoids card clipping). */
  openUpward = false;

  get filteredOptions(): SearchableMultiSelectOption[] {
    const catalog = this.allOptions();
    const q = this.search.trim();
    const base = !q
      ? catalog
      : catalog.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));

    if (!this.allowAddCustom || !q || this.controlDisabled) {
      return base;
    }
    if (findExactCatalogOptionMatch(q, catalog)) {
      return base;
    }

    const tempId = newMultiSelectTempId(q);
    const addRow: SearchableMultiSelectOption = {
      id: tempId,
      label: addCustomRowLabel(q),
      isNew: true,
    };
    return [...base, addRow];
  }

  /** Loose match so `1` and `"1"` stay in sync with option ids from APIs / forms. */
  private sameId(a: number | string, b: number | string): boolean {
    return a === b || String(a) === String(b);
  }

  isSelected(id: number | string): boolean {
    return this.selectedValues.some((v) => this.sameId(v, id));
  }

  onOptionLabelClick(opt: SearchableMultiSelectOption, event: MouseEvent): void {
    if (opt.disabled) {
      event.preventDefault();
      return;
    }
    if (opt.isNew) {
      event.preventDefault();
      event.stopPropagation();
      const typed = this.search.trim();
      if (typed) {
        void this.selectCustomValue(typed);
      }
      return;
    }
    if (this.mode === 'single') {
      event.preventDefault();
      event.stopPropagation();
      this.toggleOption(opt.id);
    }
  }

  toggleOption(id: number | string): void {
    const opt = this.allOptions().find((o) => this.sameId(o.id, id));
    if (opt?.disabled) {
      return;
    }

    const addRow = this.filteredOptions.find((o) => this.sameId(o.id, id) && o.isNew);
    if (addRow?.isNew) {
      const typed = this.search.trim();
      if (!typed) {
        return;
      }
      void this.selectCustomValue(typed);
      return;
    }

    if (this.mode === 'single') {
      if (this.isSelected(id)) {
        if (!this.required) {
          this.emitSelection([]);
        }
        return;
      }
      this.emitSelection([id]);
      this.closeDropdown();
      return;
    }
    const next = this.isSelected(id)
      ? this.selectedValues.filter((x) => !this.sameId(x, id))
      : [...this.selectedValues, id];
    this.emitSelection(next);
  }

  removeValue(id: number | string): void {
    if (this.controlDisabled) {
      return;
    }
    if (!this.isSelected(id)) {
      return;
    }
    if (this.mode === 'single' && this.required) {
      return;
    }
    const next = this.selectedValues.filter((x) => !this.sameId(x, id));
    this.removeExtraOption(id);
    this.emitSelection(next);
  }

  selectedLabels(): string[] {
    return this.selectedOptions().map((o) => o.label);
  }

  selectedOptions(): SearchableMultiSelectOption[] {
    return this.selectedValues.map((v) => {
      const found = this.allOptions().find((o) => this.sameId(o.id, v));
      if (found) {
        return found;
      }
      if (isNewMultiSelectTempId(v)) {
        return { id: v, label: labelFromNewMultiSelectTempId(v) };
      }
      return { id: v, label: String(v) };
    });
  }

  toggleOpen(): void {
    if (this.controlDisabled) {
      return;
    }
    if (this.open) {
      this.closeDropdown();
      return;
    }
    this.openUpward = this.shouldOpenUpward();
    this.open = true;
    this.cdr.markForCheck();
  }

  closeDropdown(): void {
    if (!this.open && !this.search) {
      return;
    }
    this.open = false;
    this.openUpward = false;
    this.search = '';
    this.cdr.markForCheck();
  }

  private shouldOpenUpward(): boolean {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedPanel = 280;
    return spaceBelow < estimatedPanel && spaceAbove > spaceBelow;
  }

  private onDocumentClick(event: Event): void {
    if (!this.open) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (!this.host.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  private allOptions(): SearchableMultiSelectOption[] {
    const byId = new Map<string, SearchableMultiSelectOption>();
    for (const o of [...this.options, ...this.extraOptions]) {
      byId.set(String(o.id), o);
    }
    return [...byId.values()];
  }

  private upsertExtraOption(opt: SearchableMultiSelectOption): void {
    const idx = this.extraOptions.findIndex((o) => this.sameId(o.id, opt.id));
    if (idx >= 0) {
      this.extraOptions[idx] = opt;
    } else {
      this.extraOptions.push(opt);
    }
  }

  private removeExtraOption(id: number | string): void {
    const idx = this.extraOptions.findIndex((o) => this.sameId(o.id, id));
    if (idx >= 0) {
      this.extraOptions.splice(idx, 1);
    }
  }

  private replaceSelectedId(oldId: number | string, newId: number | string): void {
    const next = this.selectedValues.map((v) => (this.sameId(v, oldId) ? newId : v));
    this.emitSelection(next);
  }

  private emitSelection(next: Array<number | string>): void {
    this.selectedValuesChange.emit(next);
    this.selectionChange.emit(next);
  }

  private async selectCustomValue(typed: string): Promise<void> {
    const label = typed.trim();
    if (!label) {
      return;
    }

    const catalog = this.allOptions();
    const existing = findExactCatalogOptionMatch(label, catalog);
    if (existing) {
      const match = catalog.find((o) => o.label === existing.label);
      if (match) {
        this.toggleOption(match.id);
        return;
      }
    }

    const tempId = newMultiSelectTempId(label);
    const chip: SearchableMultiSelectOption = { id: tempId, label };
    this.upsertExtraOption(chip);

    const already = this.isSelected(tempId);
    let next: Array<number | string>;
    if (this.mode === 'single') {
      next = [tempId];
      this.closeDropdown();
    } else if (already) {
      next = this.selectedValues;
    } else {
      next = [...this.selectedValues, tempId];
    }
    this.emitSelection(next);

    const persistMode = this.resolvePersistMode();
    if (!persistMode) {
      return;
    }

    try {
      const persistedId = await this.persistCustomValue(label, persistMode);
      this.upsertExtraOption({ id: persistedId, label });
      this.removeExtraOption(tempId);
      this.replaceSelectedId(tempId, persistedId);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : $localize`:@@jobseeker.searchableMultiSelect.persistFailed:Could not save the new value. Try again.`;
      this.store.dispatch(uiAsyncActions.recordError({ error: message, fallbackMessage: message }));
    }
  }

  private resolvePersistMode(): CustomPersistMode | null {
    if (this.customPersist) {
      return this.customPersist;
    }
    if (this.configCode) {
      return 'config';
    }
    return null;
  }

  private async persistCustomValue(
    label: string,
    mode: CustomPersistMode
  ): Promise<number | string> {
    const loc = this.locale.locale();
    if (mode === 'config') {
      const code = this.configCode;
      if (!code) {
        throw new Error('configCode required for config persist');
      }
      const row = await firstValueFrom(
        this.adminApi.ensureConfigValue(code, configDraftFromTypedLabel(label, loc))
      );
      return configValuePersistedSelectId(row);
    }
    if (mode === 'skill') {
      const draft = taxonomyDraftFromTypedLabel(label, loc);
      const row = await firstValueFrom(
        this.adminApi.createSkill({
          CategoryId: 1,
          Kind: SkillKind.Professional,
          NameEn: draft.NameEn,
          NameAr: draft.NameAr,
          IsActive: true,
        })
      );
      return row.Id;
    }
    if (mode === 'basic-skill' || mode === 'personal-skill') {
      const draft = taxonomyDraftFromTypedLabel(label, loc);
      const row = await firstValueFrom(
        this.adminApi.createSkill({
          CategoryId: 1,
          Kind: SkillKind.Personal, // catalog Kind=3 — not Basic (2)
          NameEn: draft.NameEn || draft.NameAr,
          NameAr: draft.NameAr || draft.NameEn,
          IsActive: true,
        })
      );
      if (row.Kind !== SkillKind.Personal) {
        throw new Error(
          $localize`:@@jobseeker.searchableMultiSelect.personalSkillKindMismatch:Created skill was not saved as a personal skill. Try again.`
        );
      }
      return row.Id;
    }
    const draft = taxonomyDraftFromTypedLabel(label, loc);
    const row = await firstValueFrom(
      this.adminApi.createSkill({
        CategoryId: null,
        Kind: SkillKind.TechStack,
        NameEn: draft.NameEn,
        NameAr: draft.NameAr,
        IsActive: true,
      })
    );
    return row.Id;
  }
}

export { isNewMultiSelectTempId, labelFromNewMultiSelectTempId };
