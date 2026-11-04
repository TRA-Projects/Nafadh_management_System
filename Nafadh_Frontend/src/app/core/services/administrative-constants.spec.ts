import { CatalogPicker } from '../models/catalog-picker';
import '@angular/compiler';
import '@angular/localize/init';
import { FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { EMPTY, firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { administrativeValue, AdministrativeGroup, constantPolicyHint, moduleProgressKey } from '../models/administrative-constants';
import { NafadhConstantsService } from './nafadh-constants.service';
import { jsPDF } from 'jspdf';
import { AdminRemediationRequests, remediationReadKey } from '../../portals/admin/pages/remediation-requests/remediation-requests';
import { AdminCertificates } from '../../portals/admin/pages/certificates/certificates';
import { certificateDocument, traineeAttendanceKey } from '../models/enums';
import { NafadhEvaluationTypesService } from './nafadh-evaluation-types.service';
import { NafadhWarningTypesService } from './nafadh-warning-types.service';
import { TrainerApi } from '../../portals/trainer/services/trainer-api';
import { CompanyTasks } from '../../portals/company/pages/tasks/tasks';
import { CompanyPlanWorkspace } from '../../portals/company/pages/tasks/plan-workspace';
import { CompanyProgramDetails } from '../../portals/company/pages/program-details/program-details';
import { TrainerContent } from '../../portals/trainer/pages/content/content';
import { CompanyApi } from '../../portals/company/services/company-api';
import { AdminWarnings } from '../../portals/admin/pages/warnings/warnings';
import { TrainerLiveSessions } from '../../portals/trainer/pages/live-sessions/live-sessions';
import { QuestionBank } from '../../portals/trainer/pages/question-bank/question-bank';
import { AdminNotifications } from '../../portals/admin/pages/notifications/notifications';
import { AdminPrograms } from '../../portals/admin/pages/programs/programs';
import { AdminCommunications } from '../../portals/admin/pages/communications/communications';
import { AdminTrainees, EnrichedTraineeItem } from '../../portals/admin/pages/trainees/trainees';
import { TrainerReports } from '../../portals/trainer/pages/reports/reports';
import { TraineeSupport } from '../../portals/trainee/pages/support/support';
import { TraineeAchievements } from '../../portals/trainee/pages/achievements/achievements';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApi } from '../../portals/admin/services/admin-api';
import { ConstantsManagePageComponent } from '../../portals/admin/external-system/pages/system-administration/constants-manage-page.component';
import { companyCsvCell } from '../../portals/admin/pages/companies/companies';

describe('Historical documents and remediation statuses', () => {
  it.each([
    [0, 'Completion', 'CERTIFICATE OF COMPLETION'], [1, 'Recommendation', 'CERTIFICATE OF RECOMMENDATION'],
    [2, 'Excellence', 'CERTIFICATE OF EXCELLENCE'], [99, 'unknown', 'TRAINING CERTIFICATE']
  ])('renders the actual PDF and admin preview for certificate type %s', (ordinal, key, title) => {
    const admin = Object.create(AdminCertificates.prototype);
    const [trainee] = admin.mapTraineesList([{ traineeId: 6, enrollmentId: 3, type: ordinal, isIssued: true }], 1);
    expect(admin.buildModalData(trainee).document).toEqual(certificateDocument(key));
    let pdf = '', filename = '';
    const event: [string, (this: jsPDF) => void] = ['initialized', function () {
      this.save = ((name: string) => { filename = name; pdf = this.output(); return this; }) as typeof this.save;
    }];
    const events = jsPDF.API.events;
    events.push(event);
    try {
      const page = Object.create(TraineeAchievements.prototype);
      page.generateCertificatePdf({ type: key, traineeName: 'Example', programTitle: 'Example program' });
      expect(pdf).toContain('/Title (' + title + ')');
      expect(pdf).toContain('(' + title + ') Tj');
      expect(pdf.includes('for successfully completing')).toBe(ordinal === 0);
      expect(filename.startsWith(trainee.type === 99 ? 'شهادة تدريب' : certificateDocument(ordinal).ar)).toBe(true);
    } finally {
      events.splice(events.indexOf(event), 1);
    }
  });

  it('reads numeric and historical remediation requests without interpreting rejection as revision', () => {
    const page = Object.assign(Object.create(AdminRemediationRequests.prototype), {
      api: { getRemediationRequests: () => of([0, '1', 2, 'NeedsRevision', 'NeedsModification', 'Rejected', 'Unknown']
        .map((status, i) => ({ requestId: i, status }))) }, requests: signal([]),
      searchTerm: '', selectedActionType: 'ALL', selectedStatus: 'NeedsRevision'
    });
    page.loadRequests();
    expect(page.getCountByStatus('NeedsRevision')).toBe(3);
    expect(page.filteredRequests().map((r: {requestId: number}) => r.requestId)).toEqual([2, 3, 4]);
    expect(page.getStatusLabel(remediationReadKey('Rejected'))).toBe('مرفوض');
    page.constants = { administrativeLabel: (_: string, key: string) => ['NeedsRevision', 'Approved'].includes(key) ? 'مشترك' : key };
    expect(page.getStatusLabel('Approved')).toBe(page.getStatusLabel('NeedsRevision'));
    expect(page.filteredRequests()).toHaveLength(3);
    expect(page.getStatusLabel(remediationReadKey('unknown'))).toBe('unknown');
  });

  it.each([['Approved', 1], ['NeedsRevision', 2]])('uses the persisted key for %s and reloads after save', (status, ordinal) => {
    const review = vi.fn(() => of({}));
    const page = Object.assign(Object.create(AdminRemediationRequests.prototype), {
      api: { reviewRemediationRequest: review }, auth: { userId: 9 }, selectedRequest: signal({requestId: 4}),
      isProcessing: signal(false), adminNote: 'note', closeModal: vi.fn(), loadRequests: vi.fn()
    });
    page.applyDecision(status);
    expect(review).toHaveBeenCalledWith(4, {status: ordinal, reviewedByUserId: 9, reviewNotes: 'note'});
    expect(page.loadRequests).toHaveBeenCalledOnce();
  });
});

describe('Editing fixed values', () => {
  it('keeps module progress identifiers stable for numeric and legacy data', () => {
    expect([0, '1', 2, 'in_progress', 'Completed', 'Unknown'].map(moduleProgressKey))
      .toEqual(['NotStarted', 'InProgress', 'Completed', 'InProgress', 'Completed', 'Unknown']);
  });
  it('counts historic numeric trainee attendance in enum order, independent of trainer attendance and display labels', () => {
    expect([0, '1', 2, '3', 'absent', 'Late', 4, '', 'EarlyLeave'].map(traineeAttendanceKey))
      .toEqual(['Present', 'Absent', 'Late', 'Excused', 'Absent', 'Late', undefined, undefined, undefined]);
  });
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
    ['NFD_EXT_ACT', 'Warn'],
    ['NFD_REM_STAT', 'NeedsRevision'], ['NFD_EVL_PER', 'Monthly'], ['NFD_MOD_STAT', 'InProgress'],
    ['NFD_FIL_TYPE', 'Pdf'],
    ['NFD_PRG_STAT', 'Draft'],
    ['NFD_PYS_STAT', 'Pending'],
    ['NFD_CPE_STAT', 'NotStarted'],
    ['NFD_CPI_TYPE', 'Task'],
    ['NFD_CPP_STAT', 'NotStarted'],
    ['NFD_FBK_TYPE', 'TrainerRating'],
    ['NFD_BDG_COND', 'ModulesCompletedInPeriod'],
    ['NFD_PJT_ROLE', 'Lead'],
    ['NFD_MSG_STAT', 'Sent'],
    ['NFD_TRK_STAT', 'Archived'],
    ['NFD_VER_STAT', 'Pending'],
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
    ['NFD_EXT_ACT', ['Warn', 'Terminate', 'FlagForReview']],
    ['NFD_REM_STAT', ['Pending', 'Approved', 'NeedsRevision']],
    ['NFD_EVL_PER', ['Weekly', 'Monthly', 'Midterm', 'Final', 'AdHoc']],
    ['NFD_MOD_STAT', ['NotStarted', 'InProgress', 'Completed']],
    ['NFD_FIL_TYPE', ['Pdf', 'Video', 'Image', 'Document', 'Link', 'Other']],
    ['NFD_PRG_STAT', ['Draft', 'Published', 'Archived']],
    ['NFD_PYS_STAT', ['Pending', 'Paid', 'Overdue']],
    ['NFD_TIC_STAT', ['Open', 'InProgress', 'Resolved', 'Closed']],
    ['NFD_WDR_STAT', ['Pending', 'Approved', 'Rejected']],
    ['NFD_RPT_TYPE', ['Attendance', 'Performance', 'Financial', 'Enrollment', 'Custom']],
    ['NFD_PAY_STAT', ['Pending', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled']],
    ['NFD_ANN_SCOPE', ['Platform', 'Company', 'Batch', 'Trainee', 'Trainer', 'Admin']],
    ['NFD_CMP_STAT', ['PendingApproval', 'Approved', 'Suspended', 'Rejected']],
    ['NFD_CPA_STAT', ['Draft', 'PendingApproval', 'Approved', 'Rejected']],
    ['NFD_CPE_STAT', ['NotStarted', 'InProgress', 'OnHold', 'Completed']],
    ['NFD_CPI_TYPE', ['Task', 'Project']],
    ['NFD_CPP_STAT', ['NotStarted', 'InProgress', 'Completed']],
    ['NFD_FBK_TYPE', ['TrainerRating', 'BatchExperienceRating']],
    ['NFD_BDG_COND', ['ModulesCompletedInPeriod', 'AttendanceStreak', 'HighScoreCount', 'ProjectCompletion', 'ProgramCompletion']],
    ['NFD_PJT_ROLE', ['Lead', 'Contributor']],
    ['NFD_MSG_STAT', ['Sent', 'Delivered', 'Read']],
    ['NFD_TRK_STAT', ['Active', 'Archived']],
    ['NFD_VER_STAT', ['Pending', 'Verified', 'Rejected']],
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

  it.each([
    ['NFD_PYS_STAT', 'Paid', 'مدفوع'], ['NFD_EXT_ACT', 'Terminate', 'إنهاء'],
    ['NFD_EVL_PER', 'Monthly', 'شهري'], ['NFD_MOD_STAT', 'InProgress', 'قيد التنفيذ'],
    ['NFD_PRG_STAT', 'Published', 'منشور'], ['NFD_FIL_TYPE', 'Video', 'فيديو'],
  ] as const)('%s retries an unavailable catalog and preserves inactive English-only history', (group, key, fallback) => {
    const { get, injector } = mockLookups();
    const service = runInInjectionContext(injector, () => new NafadhConstantsService());
    get.mockReturnValue(throwError(() => new Error('offline')));
    service.ensure(group);
    expect(service.administrativeLabel(group, 1)).toBe(fallback);
    get.mockReturnValue(of({ unexpected: 'invalid response' }));
    service.ensure(group);
    get.mockReturnValue(of([{ ValueKey: key, LabelAr: ' ', LabelEn: 'Historical', is_active: false }]));
    service.ensure(group);
    expect(service.administrativeLabel(group, 1)).toBe('Historical');
    expect(service.options(group)).toEqual([]);
    get.mockReturnValue(throwError(() => new Error('offline')));
    service.refresh(group);
    expect(service.administrativeLabel(group, key)).toBe('Historical');
  });

  it('changes only the escaped status text in the company program report after a rename', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const page = Object.assign(Object.create(CompanyProgramDetails.prototype), { constants });
    Object.assign(page, { program: signal(null), modules: signal([]), finishRows: vi.fn() });
    page.applyDetails({ status: 0, title: 'برنامج تاريخي' });
    expect(page.programStatusLabel(page.program().status)).toBe('مسودة');
    const model = {
      p: { status: 'Published', percent: 75, capacity: 4, occupied: 3, available: 1 },
      averageProgress: 25, trainees: [], modules: [], batches: [], exportedAt: new Date('2026-01-02')
    };
    const before = page.buildReportHtml(model);
    expect(before).toContain('منشور');
    get.mockReturnValue(of(['Published', 'Archived'].map(ValueKey => ({ ValueKey, LabelAr: '<تسمية>', IsActive: false }))));
    constants.refresh('NFD_PRG_STAT');
    expect(page.programStatusLabel('2')).toBe('<تسمية>');
    expect(page.buildReportHtml(model)).toBe(before.replace('منشور', '&lt;تسمية&gt;'));
    expect(model.p.status).toBe('Published');
  });

  it('retains the detected material key and icon when file types share a label', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const page = Object.assign(Object.create(TrainerContent.prototype), { constants });
    get.mockReturnValue(of(['Pdf', 'Video'].map(ValueKey => ({ ValueKey, LabelAr: 'مشترك' }))));
    constants.refresh('NFD_FIL_TYPE');
    for (const [name, key, icon] of [['a.PDF', 'Pdf', 'fa-file-pdf'], ['b.mp4', 'Video', 'fa-file-video']]) {
      page.onFileSelected({ target: { files: [{ name }] } });
      expect(page.selectedFileType).toBe(key);
      expect(constants.administrativeLabel('NFD_FIL_TYPE', page.selectedFileType)).toBe('مشترك');
      expect(page.getMaterialIcon(page.selectedFileType)).toContain(icon);
    }
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

  it('keeps execution filtering separate from approval even when two labels coincide', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const pages = Injector.create({ providers: [
      { provide: NafadhConstantsService, useValue: constants }, { provide: CompanyApi, useValue: {} },
      { provide: AuthService, useValue: {} }, { provide: Router, useValue: {} }
    ] });
    const page = runInInjectionContext(pages, () => new CompanyTasks());
    const plans = ['InProgress', 'OnHold'].map((executionStatus, i) => ({
      planId: i + 1, approvalStatus: 'Approved', executionStatus
    })) as ReturnType<typeof page.plans>;
    page.plans.set(plans);
    get.mockReturnValue(of(plans.map(p => ({ ValueKey: p.executionStatus, label_ar: 'تسمية مشتركة', IsActive: false }))));
    constants.refresh('NFD_CPE_STAT');
    page.filter.set('OnHold');
    expect(page.filterLabel('OnHold', '')).toBe('تسمية مشتركة');
    expect(page.executionLabel(plans[0])).toBe('تسمية مشتركة');
    expect(page.filtered().map(p => p.planId)).toEqual([2]);
    expect(page.executionLabel({ ...plans[0], approvalStatus: 'Draft' })).toBeNull();
  });

  it('refreshes execution step labels without changing step identity or item progress', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    const pages = Injector.create({ providers: [
      { provide: NafadhConstantsService, useValue: constants }, { provide: CompanyApi, useValue: {} },
      { provide: AuthService, useValue: {} }, { provide: Router, useValue: {} }, { provide: ActivatedRoute, useValue: {} }
    ] });
    const page = runInInjectionContext(pages, () => new CompanyPlanWorkspace());
    const plan = { approvalStatus: 'Approved', executionStatus: 'InProgress', progressPercentage: 50 } as NonNullable<ReturnType<typeof page.plan>>;
    page.plan.set(plan);
    get.mockReturnValue(throwError(() => new Error('offline')));
    constants.ensure('NFD_CPE_STAT');
    expect(page.steps().slice(3).map(s => s.label)).toEqual(['قيد التنفيذ', 'مكتمل']);
    const approvalSteps = page.steps().slice(0, 3);
    get.mockReturnValue(of([{ ValueKey: 'InProgress', label_ar: 'تقدم العنصر' }]));
    constants.refresh('NFD_CPP_STAT');
    for (const labels of [['تنفيذ جديد', 'إكمال جديد'], ['مشترك', 'مشترك']]) {
      get.mockReturnValue(of(['InProgress', 'Completed'].map((ValueKey, i) => ({ ValueKey, label_ar: labels[i] }))));
      constants.refresh('NFD_CPE_STAT');
      page.ask('resume');
      expect(page.confirm()?.text).toContain(`«${labels[0]}»`);
      for (const executionStatus of ['InProgress', 'Completed', 'OnHold'] as const) {
        page.plan.set({ ...plan, executionStatus });
        const steps = page.steps();
        expect(steps.slice(0, 3)).toEqual(approvalSteps);
        expect(steps.map(s => s.id)).toEqual(['preparation', 'PendingApproval', 'Approved', 'InProgress', 'Completed']);
        expect(steps.slice(3).map(s => s.label)).toEqual(labels);
        const current = steps.find(s => s.state === 'current');
        expect(current?.id).toBe(executionStatus === 'OnHold' ? 'InProgress' : executionStatus);
        if (executionStatus !== 'OnHold') expect(current?.label).toBe(page.executionLabel(executionStatus));
        expect(page.progressLabel('InProgress')).toBe('تقدم العنصر');
        expect(page.plan()?.progressPercentage).toBe(50);
      }
    }
  });

  it('uses the historical feedback label when an incomplete program blocks submission', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    get.mockReturnValue(of([{ ValueKey: 'BatchExperienceRating', label_ar: 'رأي الدفعة', IsActive: false }]));
    constants.refresh('NFD_FBK_TYPE');
    const page = Object.assign(Object.create(TraineeAchievements.prototype), {
      constants, feedbackType: () => 'BatchExperienceRating', canSubmitProgramFeedback: () => false,
      showSuccessToast: signal(false), successMessage: signal('')
    });
    vi.useFakeTimers();
    try {
      page.submitFeedback();
      expect(page.successMessage()).toContain('رأي الدفعة');
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
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
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    get.mockReturnValue(of([{ValueKey:'Company',LabelAr:'الشركة',IsActive:true}]));
    constants.refresh('NFD_ANN_SCOPE');
    const createAnnouncement = vi.fn().mockReturnValue(EMPTY);
    AdminNotifications.prototype.postAnnouncement.call(Object.assign(Object.create(AdminNotifications.prototype), {
      constants, scopeByAudience: {companies:'Company'},
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
    page.choosePlanFilter('PendingApproval');
    expect(page.planPickerKey).toBe('PendingApproval');
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
    page.choosePlanFilter('no-plan');
    expect(page.planPickerKey).toBe('no-plan');
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

  it('displays an inactive difficulty under its saved name while retaining the numeric filter', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    get.mockReturnValue(of([{ ValueKey: 'Easy', LabelAr: 'مشترك', IsActive: true },
      { ValueKey: 'Hard', LabelAr: 'مشترك', IsActive: false }]));
    constants.refresh('NFD_QUE_DIFF');
    const page = Object.assign(Object.create(QuestionBank.prototype), { constants, difficultyOptions: signal([]) });
    expect(page.getDifficultyLabel(0)).toBe('مشترك');
    expect(page.getDifficultyLabel('2')).toBe('مشترك');
    expect(page.getDifficultyLabel('hard')).toBe('مشترك');
    expect(constants.options('NFD_QUE_DIFF').map(o => o.key)).toEqual(['Easy']);
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
    get.mockReturnValue(of([{ id: 'Technical', LabelAr: ' ', LabelEn: 'اسم تاريخي', is_active: false }]));
    const service = runInInjectionContext(injector, () => new NafadhEvaluationTypesService());
    service.refresh();
    expect(service.label(0)).toBe('اسم تاريخي');
    expect((await firstValueFrom(service.getActiveTypes())).has('Technical')).toBe(false);
  });

  it('NFD_WRN_TYPE preserves warning labels and activation', () => {
    const { get, injector } = mockLookups();
    get.mockReturnValue(of([{ id: 'Attendance', LabelAr: '', LabelEn: 'اسم تاريخي', is_active: false }]));
    const service = runInInjectionContext(injector, () => new NafadhWarningTypesService());
    service.refresh();
    expect(service.label(0)).toBe('اسم تاريخي');
    expect(service.selectable('Attendance')).toBe(false);
  });
});

describe('Catalog selection by stable key', () => {
  const entries = [
    { value: 'Easy', label: 'مشترك', labelEn: 'Beginner' },
    { value: 'Hard', label: 'مشترك', labelEn: 'Advanced' }
  ];
  it.each(['NFD_TSK_PRI', 'NFD_CPI_TYPE', 'NFD_ANN_SCOPE', 'NFD_BAT_STAT'])(
    'keeps the screen contract, requires verified activity and preserves both historical keys in %s', group => {
      const { get, injector } = mockLookups();
      const service = runInInjectionContext(injector, () => new NafadhConstantsService());
      const keys = ({ NFD_TSK_PRI:['High','Low'], NFD_CPI_TYPE:['Task','Project'],
        NFD_ANN_SCOPE:['Platform','Company'], NFD_BAT_STAT:['Upcoming','Completed'] } as Record<string,string[]>)[group];
      const supported = keys.map(value => ({value,label:value}));
      expect(service.supportedChoices(group,supported)).toEqual([]);
      expect(service.supportedChoices(group,supported,true).map(o => o.value)).toEqual(keys);
      get.mockReturnValue(of([...keys.map((ValueKey,i) => ({ ValueKey, LabelAr:'مشترك', LabelEn:'Shared', IsActive:i === 0 })),
        { ValueKey:'Unsupported', LabelAr:'مشترك', IsActive:true }]));
      service.refresh(group);
      expect(service.supportedChoices(group,supported).map(o => o.value)).toEqual(keys.slice(0,1));
      const picker = new CatalogPicker();
      picker.options = service.supportedChoices(group,supported,true);
      for (const query of ['مشتر','shared']) {
        picker.search(query);
        expect(picker.results.map(o => o.value)).toEqual(keys);
        expect(picker.ambiguous(picker.results[0])).toBe(true);
      }
    });

  it('keeps numeric trainee attendance separate from trainer attendance and allows an unchanged historical note', () => {
    const { get, injector } = mockLookups();
    const constants = runInInjectionContext(injector, () => new NafadhConstantsService());
    get.mockReturnValue(of([{ValueKey:'Absent', LabelAr:'سابق', IsActive:false}, {ValueKey:'Late', LabelAr:'متأخر', IsActive:true}]));
    constants.refresh('NFD_ATT_STAT');
    const send = vi.fn().mockReturnValue(EMPTY);
    const page = Object.assign(Object.create(TrainerLiveSessions.prototype), {
      constants, originalAttendance:new Map([[8,'Absent']]),
      attendanceOptions:[{value:1,label:'غائب'},{value:2,label:'متأخر'}],
      attendanceSession:signal({id:7}), attendanceRows:signal([{traineeId:8,status:1}]),
      attendanceError:signal(''), attendanceSuccess:signal(''), attendanceSavingId:signal(null),
      api:{updateTrainerSessionAttendance:send}
    });
    expect(page.sessionAttendanceChoices.map((o: {value:string}) => o.value)).toEqual(['Late']);
    expect(page.sessionAttendanceLabel(1)).toBe('سابق');
    page.saveAttendance({traineeId:8,status:1,note:'note'});
    expect(send).toHaveBeenCalledWith(7,8,{status:1,note:'note'});
    page.saveAttendance({traineeId:9,status:1,note:null});
    expect(send).toHaveBeenCalledTimes(1);
    page.chooseSessionAttendance(8,'Late');
    expect(page.attendanceRows()[0].status).toBe(2);
  });

  it('searches both stored languages and keeps a renamed key selected', () => {
    const picker = new CatalogPicker();
    picker.options = entries;
    picker.value = 'Hard';
    picker.search('aDvAn');
    expect(picker.results.map(x => x.value)).toEqual(['Hard']);
    picker.search('مشتر');
    expect(picker.results.map(x => x.value)).toEqual(['Easy', 'Hard']);
    expect(picker.selectedLabel).toContain('Hard');
    picker.options = [{ ...entries[1], label: 'جديد' }];
    expect(picker.selectedLabel).toBe('جديد');
    expect(picker.value).toBe('Hard');
  });

  it('emits only a matching catalog key on keyboard selection, never the query', () => {
    const picker = new CatalogPicker();
    picker.options = entries;
    const emitted = vi.fn();
    picker.valueChange.subscribe(emitted);
    const press = (key: string) => picker.onKey({ key, preventDefault() {} } as KeyboardEvent);
    vi.stubGlobal('document', { getElementById: () => null });
    try {
      picker.search('unlisted');
      press('Enter');
      expect(picker.results).toEqual([]);
      expect(emitted).not.toHaveBeenCalled();
      picker.search('مشترك');
      press('ArrowDown'); press('ArrowDown'); press('Enter');
      expect(emitted.mock.calls).toEqual([['Hard']]);
      expect(picker.open).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });

  it('requires a verified active row while retaining historical display', () => {
    const { get, injector } = mockLookups();
    const service = runInInjectionContext(injector, () => new NafadhConstantsService());
    expect(service.isSelectable('NFD_WRN_LVL', 'High')).toBe(false);
    get.mockReturnValue(of([{ ValueKey: 'High', LabelAr: 'سابق', IsActive: false },
      { ValueKey: 'Low', LabelAr: 'منخفض' }, { ValueKey: 'Medium', IsActive: true }]));
    service.ensure('NFD_WRN_LVL');
    expect(service.label('NFD_WRN_LVL', 'High')).toBe('سابق');
    expect(service.isSelectable('NFD_WRN_LVL', 'Other')).toBe(false);
    expect(service.choices('NFD_WRN_LVL').map(x => x.value)).toEqual(['Medium']);
    expect(service.choices('NFD_WRN_LVL', true).map(x => x.value)).toEqual(['High', 'Low', 'Medium']);
  });
});
