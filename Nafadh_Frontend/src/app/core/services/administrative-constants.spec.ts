import '@angular/compiler';
import '@angular/localize/init';
import { FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { EMPTY, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { administrativeValue, AdministrativeGroup, constantPolicyHint } from '../models/administrative-constants';
import { NafadhConstantsService } from './nafadh-constants.service';
import { NafadhEvaluationTypesService } from './nafadh-evaluation-types.service';
import { NafadhWarningTypesService } from './nafadh-warning-types.service';
import { TrainerApi } from '../../portals/trainer/services/trainer-api';
import { AdminWarnings } from '../../portals/admin/pages/warnings/warnings';
import { QuestionBank } from '../../portals/trainer/pages/question-bank/question-bank';
import { AdminNotifications } from '../../portals/admin/pages/notifications/notifications';
import { AdminPrograms } from '../../portals/admin/pages/programs/programs';
import { AdminCommunications } from '../../portals/admin/pages/communications/communications';
import { AdminTrainees, EnrichedTraineeItem } from '../../portals/admin/pages/trainees/trainees';
import { TrainerReports } from '../../portals/trainer/pages/reports/reports';
import { TraineeSupport } from '../../portals/trainee/pages/support/support';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApi } from '../../portals/admin/services/admin-api';
import { ConstantsManagePageComponent } from '../../portals/admin/external-system/pages/system-administration/constants-manage-page.component';
import { companyCsvCell } from '../../portals/admin/pages/companies/companies';

describe('Editing fixed values', () => {
  it('shows the selected Nafadh policy even when optional catalog flags are absent', () => {
    for (const code of ['QUE_DIFF', 'EVL_TYPE', 'WRN_TYPE'])
      expect(constantPolicyHint('NFD_' + code, false, false, true)).toBe('labelsAndActivation');
    for (const code of ['ANN_SCOPE', 'CMP_STAT', 'CPA_STAT', 'USR_STAT', 'TIC_STAT', 'WDR_STAT', 'RPT_TYPE', 'PAY_STAT'])
      expect(constantPolicyHint('NFD_' + code, false, false, true)).toBe('labelsOnly');
    expect(constantPolicyHint('NFD_ATT_STAT', false, true, true)).toBe('readOnly');
    expect(constantPolicyHint('NFD_ANN_SCOPE', true, false, true)).toBe('readOnly');
    expect(constantPolicyHint('', false, false, false)).toBeNull();
  });
  function editor(group: string) {
    const updateConfigValue = vi.fn().mockReturnValue(of({}));
    return Object.assign(Object.create(ConstantsManagePageComponent.prototype), {
      api: { updateConfigValue }, selectedLookupCode: () => group, activeTab: () => 'main',
      catalogLoading: () => false, catalogLoadFailed: () => false, isReadOnlyManagementGroup: () => false,
      isFixedKeysGroup: () => true, isMainGroupWithSubCatalog: () => false, reload: vi.fn(),
      editingId: signal(null), modalOpen: signal(false), editKeyError: signal(''), constants: { refresh: vi.fn() },
      form: new FormBuilder().nonNullable.group({ code: '', label_ar: '', label_en: '', IsActive: true }),
      formPipeline: { run: async ({ work }: { work: () => Promise<unknown> }) => ({ ok: true, value: await work() }) }
    });
  }
  it.each([
    ['NFD_USR_STAT', 'ValueKey', 'Inactive'], ['NFD_QUE_DIFF', 'valueKey', 'Easy'],
    ['NFD_EVL_TYPE', 'value_key', 'Technical'], ['NFD_WRN_TYPE', 'VALUE_KEY', 'Performance']
  ])('saves %s by textual key and omits untouched activation', async (group, property, key) => {
    const page = editor(group);
    page.openEdit({ id: 57, code: 'V01', [property]: key, label_ar: 'اسم', label_en: 'Name', isActive: false });
    expect(page.form.getRawValue().code).toBe(key);
    expect(page.form.getRawValue().IsActive).toBe(false);
    await page.save();
    expect(page.api.updateConfigValue).toHaveBeenCalledWith(group, key, { label_ar: 'اسم', label_en: 'Name' });
  });
  it('refuses an unresolved edit instead of submitting the row identifier', async () => {
    const page = editor('NFD_CMP_STAT');
    page.openEdit({ id: 57, code: 'V01' });
    await page.save();
    expect(page.editKeyError()).toContain('ValueKey');
    expect(page.api.updateConfigValue).not.toHaveBeenCalled();
  });
  it.each([
    ['NFD_TIC_STAT', 'Open'], ['NFD_WDR_STAT', 'Pending'], ['NFD_RPT_TYPE', 'Performance'],
    ['NFD_QUE_TYPE', 'MultipleChoice'],
    ['NFD_WRN_LVL', 'Low'],
    ['NFD_WRN_SCOPE', 'Company'],
    ['NFD_TSK_PRI', 'Low'],
    ['NFD_PAY_STAT', 'PartiallyPaid']
  ])('%s submits only labels even if its hidden activation control is dirty', async (group, key) => {
    const page = editor(group);
    page.openEdit({ id: 57, ValueKey: key, label_ar: 'تجربة', label_en: 'Test', IsActive: false });
    page.form.controls.IsActive.setValue(true);
    page.form.controls.IsActive.markAsDirty();
    await page.save();
    expect(page.api.updateConfigValue).toHaveBeenCalledWith(group, key, { label_ar: 'تجربة', label_en: 'Test' });
  });
  it.each([true, false])('sends an explicit legacy activation change to %s', async active => {
    const page = editor('NFD_QUE_DIFF');
    page.openEdit({ id: 'Easy', code: 'V01', label_ar: 'اسم', label_en: 'Name', IsActive: !active });
    page.form.controls.IsActive.setValue(active);
    page.form.controls.IsActive.markAsDirty();
    await page.save();
    expect(page.api.updateConfigValue).toHaveBeenCalledWith('NFD_QUE_DIFF', 'Easy', expect.objectContaining({ IsActive: active }));
  });
});

describe('Company CSV cells', () => {
  it('preserves commas, double quotes and line breaks within one quoted field', () => {
    expect(companyCsvCell('شركة, "معتمدة"\nاليوم')).toBe('"شركة, ""معتمدة""\nاليوم"');
  });
  it.each(['=1+1', ' +1', '-2', '@SUM(A1)', '\t=1', '\r=1'])('neutralizes %j', value => {
    expect(companyCsvCell(value)).toBe('"\'' + value + '"');
  });
});

function mockLookups() {
  const get = vi.fn();
  const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: { get } }] });
  return { get, injector };
}

describe('Administrative constant identities and labels', () => {
  const groups: Array<[AdministrativeGroup, string[]]> = [
    ['NFD_TIC_STAT', ['Open', 'InProgress', 'Resolved', 'Closed']],
    ['NFD_WDR_STAT', ['Pending', 'Approved', 'Rejected']],
    ['NFD_RPT_TYPE', ['Attendance', 'Performance', 'Financial', 'Enrollment', 'Custom']],
    ['NFD_PAY_STAT', ['Pending', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled']],
    ['NFD_ANN_SCOPE', ['Platform', 'Company', 'Batch', 'Trainee', 'Trainer', 'Admin']],
    ['NFD_CMP_STAT', ['PendingApproval', 'Approved', 'Suspended', 'Rejected']],
    ['NFD_CPA_STAT', ['Draft', 'PendingApproval', 'Approved', 'Rejected']],
    ['NFD_QUE_TYPE', ['MultipleChoice', 'TrueFalse', 'Essay']],
    ['NFD_WRN_LVL', ['Low', 'Medium', 'High', 'Critical']],
    ['NFD_WRN_SCOPE', ['Company', 'Trainee']],
    ['NFD_TSK_PRI', ['Low', 'Medium', 'High', 'Critical']],
    ['NFD_USR_STAT', ['Active', 'Inactive', 'Suspended', 'PendingVerification']],
  ];
  it.each(groups)('%s preserves ordinals, filter keys and inactive records after a rename', (group, keys) => {
    const { get, injector } = mockLookups();
    const service = runInInjectionContext(injector, () => new NafadhConstantsService());
    const rows = keys.map((key, i) => ({ id: i + 100, ValueKey: key, label_ar: 'اسم ' + i, IsActive: false }));
    get.mockReturnValue(of({ Data: { rows } }));
    service.ensure(group);
    keys.forEach((key, i) => {
      expect(administrativeValue(group, String(i))?.key).toBe(key);
      expect(service.administrativeLabel(group, i)).toBe(rows[i].label_ar);
      expect(service.administrativeLabel(group, key)).toBe(rows[i].label_ar);
    });
    rows[0].label_ar = 'اسم جديد';
    service.refresh(group);
    expect(service.administrativeLabel(group, 0)).toBe('اسم جديد');
    expect(service.options(group)).toEqual([]);
    expect(service.all(group).map(row => row.key)).toEqual(keys);
    expect(service.administrativeLabel(group, 'unknown')).toBe('unknown');
  });

  it('keeps question-bank filters and edit ordinals stable after renaming historical types', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const pages = Injector.create({ providers: [{ provide: NafadhConstantsService, useValue: constants }] });
    const page = runInInjectionContext(pages, () => new QuestionBank({} as TrainerApi, {} as AuthService, {} as ActivatedRoute, {} as Router));
    const keys = ['MultipleChoice', 'TrueFalse', 'Essay'];
    page.questions.set([0, 'TrueFalse', '2'].map((questionType, i) => ({
      questionType, questionId: i + 1, questionText: 'سؤال', isActive: true, difficulty: 0,
      points: 1, createdAt: '', options: []
    })));
    for (const label of ['أول', 'محدث']) {
      get.mockReturnValue(of(keys.map(ValueKey => ({ ValueKey, label_ar: label, IsActive: false }))));
      constants.refresh('NFD_QUE_TYPE');
      keys.forEach((key, i) => {
        page.typeFilter.set(String(i));
        expect(page.getQuestionTypeLabel(key)).toBe(label);
        expect(page.filteredQuestions().map(q => q.questionId)).toEqual([i + 1]);
        page.openEditQuestion(page.filteredQuestions()[0]);
        expect(page.questionForm.questionType).toBe(i);
      });
    }
  });

  it('filters historical warning levels by identity when two labels are identical', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const page = Object.assign(Object.create(AdminWarnings.prototype), {
      constants, searchTerm: '', selectedLevel: 'Low', selectedStatus: 'ALL',
      warnings: () => [{ level: 0 }, { level: 'High' }, { level: 'Low' }]
    });
    for (const label of ['أول', 'محدث']) {
      get.mockReturnValue(of(['Low', 'High'].map(ValueKey => ({ ValueKey, label_ar: label, IsActive: false }))));
      constants.refresh('NFD_WRN_LVL');
      expect(page.getLevelLabel(0)).toBe(label);
      expect(page.getLevelLabel('High')).toBe(label);
      expect(page.filteredWarnings()).toEqual([{ level: 0 }, { level: 'Low' }]);
    }
  });

  it('keeps company recipients, scope and channels in the announcement request', () => {
    const createAnnouncement = vi.fn().mockReturnValue(EMPTY);
    AdminNotifications.prototype.postAnnouncement.call(Object.assign(Object.create(AdminNotifications.prototype), {
      newAnnounceData: { title: 'test', content: 'test', mainAudience: 'companies',
        companyScope: 'specific_companies', selectedCompanyIds: ['7'], channels: { inApp: true, email: false } },
      posting: signal(false), announceError: signal(null), api: { createAnnouncement }
    }));
    expect(createAnnouncement).toHaveBeenCalledWith(expect.objectContaining({
      scopeType: 1, targetScope: 'companies', companyIds: [7], trainerIds: [], traineeIds: [],
      channels: { inApp: true, email: false }
    }));
  });

  it('counts open tickets and filters withdrawal requests by key even with identical display names', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const pages = Injector.create({ providers: [
      { provide: NafadhConstantsService, useValue: constants }, { provide: NafadhWarningTypesService, useValue: {} },
      { provide: AdminApi, useValue: {} }, { provide: Router, useValue: {} }, { provide: ActivatedRoute, useValue: {} }
    ] });
    const tickets = runInInjectionContext(pages, () => new AdminCommunications());
    tickets.batchGroups.set(['Open', 'Resolved', 'Open', 'Closed'].map((status, i) => ({
      status, conversationId: i, groupName: '', batchId: i, batchName: '', trainerUserId: i, trainerName: '', membersCount: 1, createdAt: ''
    })));
    const trainees = runInInjectionContext(pages, () => new AdminTrainees(pages.get(AdminApi), pages.get(Router), {} as DomSanitizer));
    trainees.trainees.set([
      { traineeId: 1, withdrawalStatus: 'Pending' }, { traineeId: 2, withdrawalStatus: 'Approved' },
      { traineeId: 3, withdrawalStatus: 'None', completionStatus: 'Dropped' }, { traineeId: 4, withdrawalStatus: 'Rejected' }
    ] as EnrichedTraineeItem[]);
    for (const label of ['أ', 'ب']) {
      for (const [group, keys] of groups.filter(([g]) => g === 'NFD_TIC_STAT' || g === 'NFD_WDR_STAT')) {
        get.mockReturnValue(of(keys.map(ValueKey => ({ ValueKey, label_ar: label, IsActive: false }))));
        constants.refresh(group);
      }
      expect(tickets.constants.administrativeLabel('NFD_TIC_STAT', 'Open')).toBe(label);
      expect(tickets.openGroups()).toBe(2);
      trainees.statusFilter.set('WITHDRAWAL_PENDING');
      expect(trainees.filtered().map(t => t.traineeId)).toEqual([1]);
      trainees.statusFilter.set('DROPPED');
      expect(trainees.filtered().map(t => t.traineeId)).toEqual([2, 3]);
    }
    const support = Object.create(TraineeSupport.prototype);
    expect(support.getWithdrawalStatus({ subject: 'طلب انسحاب', status: 'Open' })).toBeNull();
    expect(support.getWithdrawalStatus({ isWithdrawal: true, originalRequest: { status: 2 } })).toBe('rejected');
  });

  it('preserves trainer report filters, history results and generated type after a rename', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const pages = Injector.create({ providers: [{ provide: NafadhConstantsService, useValue: constants }] });
    const records = ['Attendance', 'Attendance', 'Performance', 'Financial', 'Enrollment', 'Custom'].map((type, i) => ({
      type, reportId: i, generatedAt: '2026-01-0' + (i + 1), filtersJson: '{"source":"TrainerPortal"}'
    }));
    const api = { getTrainerReports: () => of(records), generateTrainerPortalReport: vi.fn().mockReturnValue(EMPTY) };
    const page = runInInjectionContext(pages, () => new TrainerReports(api as unknown as TrainerApi, {} as AuthService, {} as DomSanitizer));
    page.generatedByUserId = 5;
    page.trainerId = 8;
    page.selectedBatchId.set(12);
    for (const label of ['الأداء', 'الأداء المعدّل']) {
      get.mockReturnValue(of([{ ValueKey: 'Performance', label_ar: label, IsActive: false }]));
      constants.refresh('NFD_RPT_TYPE');
      expect(page.getHistoryReportTitle('Performance')).toBe(label);
      page['loadReportHistory']();
      expect(page.reportHistory().map(r => r.reportId)).toEqual([5, 2, 1]);
      page.previewReport('Performance');
      expect(api.generateTrainerPortalReport).toHaveBeenLastCalledWith({
        type: 'Performance', trainerId: 8, generatedByUserId: 5, filtersJson: '{"source":"TrainerPortal","batchId":12}'
      });
    }
  });

  it('renames a plan filter option and batch badges without changing the selected batches', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const pageInjector = Injector.create({ providers: [
      { provide: NafadhConstantsService, useValue: constants }, { provide: FormBuilder, useValue: new FormBuilder() },
      { provide: AdminApi, useValue: {} }, { provide: Router, useValue: {} }, { provide: ActivatedRoute, useValue: {} }
    ] });
    const page = runInInjectionContext(pageInjector, () => new AdminPrograms());
    page.batches.set(['بانتظار اعتماد الهيئة', 1, 'PendingApproval', 'معتمدة', 'مرفوضة - تحتاج تعديل',
      'مسودة لدى الشركة', 'لم تُرفع بعد', 'الربط يحتاج مراجعة'].map((coursePlanStatus, batchId) => ({ batchId, coursePlanStatus })));
    page.planFilter.set('بانتظار الاعتماد');
    const ids = () => page.filteredBatches().map(row => row.batchId);
    const label = (index: number) => page.batchPlanLabel(page.getBatchPlanStatus(page.batches()[index]));
    expect(ids()).toEqual([0, 1, 2]);
    for (const name of ['بانتظار الموافقة', 'بانتظار الموافقة-اختبار']) {
      get.mockReturnValue(of([{ ValueKey: 'PendingApproval', label_ar: name }, { ValueKey: 'Draft', label_ar: 'مسودة اختبار' }]));
      constants.refresh('NFD_CPA_STAT');
      expect(page.planFilterOptions().find(option => option.value === page.planFilter())?.label).toBe(name);
      expect(label(0)).toBe(name);
      expect(ids()).toEqual([0, 1, 2]);
      expect(page.pendingPlansCount()).toBe(3);
    }
    expect(label(5)).toBe('مسودة اختبار');
    expect(label(7)).toBe('الربط يحتاج مراجعة');
    page.planFilter.set('لم تُرفع بعد');
    expect(label(6)).toBe('لم تُرفع بعد');
    expect(ids()).toEqual([6]);
  });

  it('only pending plans enable an approval decision', () => {
    for (const status of [0, 1, 2, 3, 'Draft', 'PendingApproval', 'Approved', 'Rejected', 'اسم جديد']) {
      const page = Object.assign(Object.create(AdminPrograms.prototype), {
        selectedPlan: () => ({ planId: 7, approvalStatus: status }), selectedPlanBatch: () => ({ batchId: 5 }),
        isLoadingPlan: () => false, isSubmittingDecision: () => false, planErrorMessage: () => ''
      });
      expect(page.canReviewSelectedPlan()).toBe(status === 1 || status === 'PendingApproval');
    }
  });
});

describe('Existing Nafadh lookups', () => {
  it.each([
    ['NFD_QUE_DIFF', 'Easy', 'ValueKey'],
    ['NFD_EVL_TYPE', 'Technical', 'VALUE_KEY'],
    ['NFD_WRN_TYPE', 'Attendance', 'value_key']
  ])('reads the explicit key before a conflicting numeric id for %s', (group, key, field) => {
    const { get, injector } = mockLookups();
    const service = runInInjectionContext(injector, () => new NafadhConstantsService());
    get.mockReturnValue(of({ Data: { rows: [{ id: 2, [field]: key, label_ar: 'تاريخي', IsActive: false }] } }));
    service.ensure(group);
    expect(service.all(group)).toEqual([{ key, label: 'تاريخي', isActive: false }]);
    expect(service.label(group, key)).toBe('تاريخي');
    expect(service.options(group)).toEqual([]);
  });

  it('keeps question option ordinals for both explicit keys and legacy ids', () => {
    const page = Object.assign(Object.create(QuestionBank.prototype), {
      api: { getQuestionDifficultyConstants: () => of({ Data: { rows: [
        { id: 2, VALUE_KEY: 'Easy', label_ar: 'سهل', IsActive: true },
        { id: 'Hard', label_ar: 'صعب', IsActive: true },
        { id: 0, valueKey: 'Medium', IsActive: false }
      ] } }) },
      difficultyOptions: signal([]), difficultyOptionsError: signal(false)
    });
    page.loadDifficultyOptions();
    expect(page.difficultyOptions()).toEqual([{ value: 0, label: 'سهل' }, { value: 2, label: 'صعب' }]);
  });

  it('uses explicit keys in the dedicated evaluation and warning readers', async () => {
    const { get, injector } = mockLookups();
    const evaluation = runInInjectionContext(injector, () => new NafadhEvaluationTypesService());
    const warning = runInInjectionContext(injector, () => new NafadhWarningTypesService());
    get.mockReturnValue(of([{ id: 2, Value_Key: 'Technical', label_ar: 'تقني', IsActive: true }]));
    evaluation.refresh();
    expect(evaluation.label('Technical')).toBe('تقني');
    expect(await firstValueFrom(evaluation.getActiveTypes())).toEqual(new Set(['Technical']));
    get.mockReturnValue(of([{ id: 2, VALUEKEY: 'Performance', label_ar: 'اختبار', IsActive: false }]));
    warning.refresh();
    expect(warning.label('Performance')).toBe('اختبار');
    expect(warning.selectable('Performance')).toBe(false);
  });

  it('NFD_QUE_DIFF uses the trainer read endpoint and preserves Easy, Medium and Hard', async () => {
    const { get, injector } = mockLookups();
    const rows = ['Easy', 'Medium', 'Hard'].map(id => ({ id, label_ar: id, label_en: id, IsActive: true }));
    get.mockReturnValue(of({ Data: { rows } }));
    const api = new TrainerApi(injector.get(HttpClient));
    expect((await firstValueFrom(api.getQuestionDifficultyConstants())).Data.rows).toEqual(rows);
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/management\/lookups\/question-difficulties$/));
  });

  it('NFD_EVL_TYPE keeps inactive historical names out of new choices', async () => {
    const { get, injector } = mockLookups();
    get.mockReturnValue(of([{ id: 'Technical', label_ar: 'اسم تاريخي', IsActive: false }]));
    const service = runInInjectionContext(injector, () => new NafadhEvaluationTypesService());
    service.refresh();
    expect(service.label(0)).toBe('اسم تاريخي');
    expect((await firstValueFrom(service.getActiveTypes())).has('Technical')).toBe(false);
  });

  it('NFD_WRN_TYPE preserves warning labels and activation', () => {
    const { get, injector } = mockLookups();
    get.mockReturnValue(of([{ id: 'Attendance', label_ar: 'اسم تاريخي', IsActive: false }]));
    const service = runInInjectionContext(injector, () => new NafadhWarningTypesService());
    service.refresh();
    expect(service.label(0)).toBe('اسم تاريخي');
    expect(service.selectable('Attendance')).toBe(false);
  });
});
