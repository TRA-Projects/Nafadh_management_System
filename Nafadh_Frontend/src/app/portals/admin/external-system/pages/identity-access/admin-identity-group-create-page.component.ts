/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import type { IdentityAccessUserTypeDto } from '../../legacy/core/api/models/identity-access.models';
import { IdentityAccessApiService } from '../../legacy/core/api/services/identity-access-api.service';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { identityAccessFeature } from '../../legacy/core/store/identity-access/identity-access.reducer';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { BackArrowButtonComponent } from '../../legacy/core/ui/back-arrow-button/back-arrow-button.component';
import { FormPipelineService } from '../../legacy/core/ui/form-pipeline.service';
import { ValidationMessagePipe } from '../../legacy/core/validators';

@Component({
  selector: 'app-admin-identity-group-create-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ValidationMessagePipe, BackArrowButtonComponent],
  templateUrl: './admin-identity-group-create-page.component.html',
  styleUrl: './admin-identity-group-create-page.component.scss',
})
export class AdminIdentityGroupCreatePageComponent implements OnInit {
  private readonly api = inject(IdentityAccessApiService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly formPipeline = inject(FormPipelineService);
  private readonly fb = inject(FormBuilder);
  readonly locale = inject(LocaleService);
  readonly requiredValidator = Validators.required;

  readonly backToList = '/admin/external-system/identity/groups';
  readonly backToListAria = $localize`:@@jobseeker.identityAccess.groupsBackToListAria:Back to groups`;
  readonly na = $localize`:@@jobseeker.common.na:—`;

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    userTypeId: [0, [Validators.required, Validators.min(1)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9]{1,49}$/)]],
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    sortOrder: [0],
    isActive: [true],
  });

  private readonly groupsCache = toSignal(this.store.select(identityAccessFeature.selectGroups), {
    initialValue: null,
  });

  readonly types = computed(() => this.groupsCache() ?? []);

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
  }

  typeLabel(row: IdentityAccessUserTypeDto): string {
    return (this.locale.locale() === 'ar' ? row.NameAr : row.NameEn) || this.na;
  }

  async save(): Promise<void> {
    const result = await this.formPipeline.run({
      form: this.form,
      work: () => {
        const raw = this.form.getRawValue();
        return firstValueFrom(
          this.api.createGroup({
            UserTypeId: Number(raw.userTypeId),
            Code: raw.code.trim(),
            NameEn: raw.nameEn.trim(),
            NameAr: raw.nameAr.trim(),
            SortOrder: Number(raw.sortOrder) || 0,
            IsActive: !!raw.isActive,
          })
        );
      },
      execute: {
        successMessage: $localize`:@@jobseeker.identityAccess.groupCreated:Group created`,
      },
    });

    if (result.ok) {
      await this.router.navigateByUrl(this.backToList);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl(this.backToList);
  }

  private async loadCatalog(): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      await this.asyncExec.execute(
        () => firstValueFrom(this.api.getGroups(true)),
        {
          recordSuccess: false,
          progressMessage: $localize`:@@jobseeker.common.loading:Loading…`,
        }
      );
      this.loadState.set('ready');
    } catch {
      this.loadError.set($localize`:@@jobseeker.identityAccess.groupsLoadError:Could not load groups.`);
      this.loadState.set('error');
    }
  }
}
