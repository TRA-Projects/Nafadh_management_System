/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { IdentityAccessRoleRowDto } from '../../legacy/core/api/models/identity-access.models';
import { IdentityAccessApiService } from '../../legacy/core/api/services/identity-access-api.service';
import { LocaleService } from '../../legacy/core/locale/locale.service';
import { AsyncExecutorService } from '../../legacy/core/ui/async-executor.service';
import { BackArrowButtonComponent } from '../../legacy/core/ui/back-arrow-button/back-arrow-button.component';
import { FormPipelineService } from '../../legacy/core/ui/form-pipeline.service';
import { ValidationMessagePipe } from '../../legacy/core/validators';

@Component({
  selector: 'app-admin-identity-role-create-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ValidationMessagePipe, BackArrowButtonComponent],
  templateUrl: './admin-identity-role-create-page.component.html',
  styleUrl: './admin-identity-role-create-page.component.scss',
})
export class AdminIdentityRoleCreatePageComponent implements OnInit {
  private readonly api = inject(IdentityAccessApiService);
  private readonly router = inject(Router);
  private readonly asyncExec = inject(AsyncExecutorService);
  private readonly formPipeline = inject(FormPipelineService);
  private readonly locale = inject(LocaleService);
  private readonly fb = inject(FormBuilder);
  readonly requiredValidator = Validators.required;

  readonly backToList = '/admin/external-system/identity/roles';
  readonly backToListAria = $localize`:@@jobseeker.identityAccess.rolesBackToListAria:Back to roles`;

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal<string | null>(null);
  readonly templateRoles = signal<IdentityAccessRoleRowDto[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    parentRoleId: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
  }

  async save(): Promise<void> {
    const result = await this.formPipeline.run({
      form: this.form,
      work: () => {
        const raw = this.form.getRawValue();
        return firstValueFrom(
          this.api.createRole({
            Name: raw.name.trim(),
            ParentRoleId: raw.parentRoleId,
          })
        );
      },
      execute: {
        successMessage: $localize`:@@jobseeker.identityAccess.roleCreated:Role created`,
      },
    });

    if (result.ok) {
      await this.router.navigateByUrl(this.backToList);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl(this.backToList);
  }

  templateLabel(row: IdentityAccessRoleRowDto): string {
    const display = this.locale.locale() === 'ar' ? row.DisplayNameAr : row.DisplayNameEn;
    if (display) {
      return display;
    }
    const group = this.locale.locale() === 'ar' ? row.UserGroupNameAr : row.UserGroupNameEn;
    return group || row.Name || '';
  }

  private async loadCatalog(): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      await this.asyncExec.execute(
        async () => {
          const templates = await firstValueFrom(
            this.api.getRolesPage({ pageIndex: 0, pageSize: 15, templatesOnly: true, cache: false })
          );
          let templateRows = templates.rows ?? [];
          const total = templates.total ?? templateRows.length;
          let pageIndex = 1;
          while (templateRows.length < total && pageIndex < 20) {
            const more = await firstValueFrom(
              this.api.getRolesPage({
                pageIndex,
                pageSize: 15,
                templatesOnly: true,
                cache: false,
              })
            );
            templateRows = templateRows.concat(more.rows ?? []);
            pageIndex += 1;
            if (!(more.rows ?? []).length) {
              break;
            }
          }
          this.templateRoles.set(templateRows);
        },
        {
          recordSuccess: false,
          progressMessage: $localize`:@@jobseeker.common.loading:Loading…`,
        }
      );
      this.loadState.set('ready');
    } catch {
      this.templateRoles.set([]);
      this.loadError.set($localize`:@@jobseeker.identityAccess.rolesLoadError:Could not load roles.`);
      this.loadState.set('error');
    }
  }
}
