import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NafadhWarningTypesService } from '../../../../core/services/nafadh-warning-types.service';
import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminApi } from '../../services/admin-api';

export type RemediationActionType =
  | 'طلب إصلاح المخالفة'
  | 'طلب تصحيح الوضع'
  | 'طلب إعادة النظر في الإنذار'
  | 'طلب تمديد المهلة'
  | 'طلب إلغاء الإنذار'
  | 'طلب آخر';

export type RemediationRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'NeedsRevision';

export function remediationReadKey(value: unknown): string {
  const key = String(value ?? '').trim();
  switch (key.toLowerCase()) {
    case '0': case 'pending': return 'Pending';
    case '1': case 'approved': return 'Approved';
    case '2': case 'needsrevision': case 'needsmodification': return 'NeedsRevision';
    case 'rejected': return 'Rejected';
    default: return key || '—';
  }
}

export interface RemediationRequestDto {
  requestId: number;
  warningId: number;
  companyId: number;
  companyName: string;
  warningIssuedDate: string;
  violationReasons: string[];
  requestDate: string;
  actionType: RemediationActionType;
  companyExplanation: string;
  attachedFiles?: string[];
  status: RemediationRequestStatus;
  adminDecision?: string;
  decisionDate?: string;
  decisionBy?: string;
}

@Component({
  selector: 'app-remediation-requests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './remediation-requests.html',
  styleUrls: ['./remediation-requests.css']
})
export class AdminRemediationRequests implements OnInit {

  private readonly auth = inject(AuthService);
  readonly constants = inject(NafadhConstantsService);
  readonly warningTypes = inject(NafadhWarningTypesService);
  requests = signal<RemediationRequestDto[]>([]);

  selectedRequest = signal<RemediationRequestDto | null>(null);

  searchTerm = '';

  selectedStatus = 'ALL';

  selectedActionType = 'ALL';

  adminNote = '';

  isProcessing = signal(false);

  constructor(
    private api: AdminApi,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.constants.ensure('NFD_REM_STAT');
    this.warningTypes.refresh();
    this.loadRequests();
  }

  // ================================
  // BACK TO WARNINGS
  // ================================

  goToWarnings(): void {
    this.router.navigate(['/admin/warnings']);
  }

  // ================================
  // LOAD REQUESTS
  // ================================

  loadRequests(): void {
    const apiAny = this.api as any;

    if (
      apiAny.getRemediationRequests &&
      typeof apiAny.getRemediationRequests === 'function'
    ) {
      apiAny.getRemediationRequests().subscribe({
        next: (res: any) => {
          const rawList = Array.isArray(res) ? res : (res?.items || []);
          
          // مطابقة أسماء الباك إند مع أسماء الـ HTML والواجهة تلقائياً
          const list = rawList.map((item: any) => ({
            ...item,
            status: remediationReadKey(item.status),
            actionType: item.requestedAction || 'طلب إصلاح المخالفة',
            requestDate: item.submissionDate,
            violationReasons: [item.originalViolationType || 'مخالفة عامة'],
            companyExplanation: item.reviewNotes || 'لا توجد إفادة مسجلة'
          }));

          this.requests.set(list);
        },
        error: (error: any) => {
          console.error(
            'Error loading remediation requests:',
            error
          );
          this.requests.set([]);
        }
      });
    } else {
      console.warn(
        'getRemediationRequests() is not implemented in AdminApi.'
      );
      this.requests.set([]);
    }
  }

  // ================================
  // FILTER
  // ================================

  filteredRequests(): RemediationRequestDto[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.requests().filter(request => {
      const companyName = request.companyName?.toLowerCase() || '';

      const matchSearch =
        !term ||
        companyName.includes(term) ||
        ('req-' + request.requestId).toLowerCase().includes(term) ||
        ('cw-' + request.warningId).toLowerCase().includes(term);

      const matchStatus =
        this.selectedStatus === 'ALL' ||
        request.status === this.selectedStatus;

      const matchAction =
        this.selectedActionType === 'ALL' ||
        request.actionType === this.selectedActionType;

      return matchSearch && matchStatus && matchAction;
    });
  }

  // ================================
  // MODAL
  // ================================

  openDecisionModal(request: RemediationRequestDto): void {
    this.selectedRequest.set(request);
    this.adminNote = request.adminDecision || '';
  }

  closeModal(): void {
    this.selectedRequest.set(null);
    this.adminNote = '';
  }

  // ================================
  // DECISION
  // ================================

  applyDecision(status: 'Approved' | 'NeedsRevision'): void {
    const request = this.selectedRequest();

    if (!request || (status !== 'Approved' && status !== 'NeedsRevision')) {
      return;
    }

    if (!this.adminNote.trim() && status !== 'Approved') {
      alert('يرجى تدوين ملاحظات القرار أو التبرير الموجه للشركة.');
      return;
    }

    const reviewer = this.auth.userId;
    if (!reviewer || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.api.reviewRemediationRequest(request.requestId, {
      status: status === 'Approved' ? 1 : 2,
      reviewNotes: this.adminNote.trim() || 'تمت الموافقة على الطلب واعتماد الإجراء المقترح.',
      reviewedByUserId: reviewer
    }).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.closeModal();
        this.loadRequests();
      },
      error: () => {
        this.isProcessing.set(false);
        alert('تعذر حفظ القرار. لم تتغير حالة الطلب.');
      }
    });
  }

  // ================================
  // STATUS
  // ================================

  getStatusLabel(status: string): string {
    return status === 'Rejected' ? 'مرفوض' : this.constants.administrativeLabel('NFD_REM_STAT', status);
  }

  getStatusClass(status: RemediationRequestStatus): string {
    switch (status) {
      case 'Pending':
        return 'st-pending';
      case 'Approved':
        return 'st-approved';
      case 'Rejected':
        return 'st-rejected';
      case 'NeedsRevision':
        return 'st-modify';
      default:
        return '';
    }
  }

  // ================================
  // COUNTS
  // ================================

  getCountByStatus(status: RemediationRequestStatus): number {
    return this.requests()
      .filter(request => request.status === status)
      .length;
  }
}