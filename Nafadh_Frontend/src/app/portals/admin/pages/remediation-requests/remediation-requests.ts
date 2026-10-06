import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 استيراد FormsModule
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
  | 'NeedsModification';

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
    FormsModule // 👈 تم إضافة FormsModule هنا لإصلاح أخطاء ngModel
  ],
  templateUrl: './remediation-requests.html',
  styleUrls: ['./remediation-requests.css']
})
export class AdminRemediationRequests implements OnInit {

  requests = signal<RemediationRequestDto[]>([]);
  selectedRequest = signal<RemediationRequestDto | null>(null);

  searchTerm = '';
  selectedStatus = 'ALL';
  selectedActionType = 'ALL';

  adminNote = '';
  isProcessing = signal(false);

  constructor(private api: AdminApi) {}

  ngOnInit(): void {
    this.loadRequests();
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
          const list = Array.isArray(res)
            ? res
            : (res?.items || []);

          this.requests.set(list);
        },
        error: (error: any) => {
          console.error('Error loading remediation requests:', error);
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

      const companyName =
        request.companyName?.toLowerCase() || '';

      const matchSearch =
        !term ||
        companyName.includes(term) ||
        ('req-' + request.requestId)
          .toLowerCase()
          .includes(term) ||
        ('cw-' + request.warningId)
          .toLowerCase()
          .includes(term);

      const matchStatus =
        this.selectedStatus === 'ALL' ||
        request.status === this.selectedStatus;

      const matchAction =
        this.selectedActionType === 'ALL' ||
        request.actionType === this.selectedActionType;

      return (
        matchSearch &&
        matchStatus &&
        matchAction
      );
    });
  }

  // ================================
  // MODAL
  // ================================

  openDecisionModal(
    request: RemediationRequestDto
  ): void {
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

  applyDecision(
    status: RemediationRequestStatus
  ): void {

    const request = this.selectedRequest();

    if (!request) {
      return;
    }

    if (
      !this.adminNote.trim() &&
      status !== 'Approved'
    ) {
      alert(
        'يرجى تدوين ملاحظات القرار أو التبرير الموجه للشركة.'
      );
      return;
    }

    this.isProcessing.set(true);

    const updatePayload = {
      status: status,

      adminDecision:
        this.adminNote.trim() ||
        'تمت الموافقة على الطلب واعتماد الإجراء المقترح.',

      decisionDate:
        new Date().toISOString(),

      decisionBy:
        'أدمن الامتثال والرقابة'
    };

    const apiAny = this.api as any;

    if (
      apiAny.updateRemediationStatus &&
      typeof apiAny.updateRemediationStatus === 'function'
    ) {

      apiAny
        .updateRemediationStatus(
          request.requestId,
          updatePayload
        )
        .subscribe({

          next: () => {

            this.isProcessing.set(false);

            request.status = status;
            request.adminDecision =
              updatePayload.adminDecision;

            request.decisionDate =
              updatePayload.decisionDate;

            request.decisionBy =
              updatePayload.decisionBy;

            this.closeModal();

            this.loadRequests();
          },

          error: (error: any) => {

            console.error(
              'Error updating request:',
              error
            );

            this.isProcessing.set(false);

            alert(
              'حدث خطأ أثناء تحديث حالة الطلب.'
            );
          }
        });

    } else {

      console.warn(
        'updateRemediationStatus() is not implemented in AdminApi.'
      );

      // Temporary local update
      request.status = status;
      request.adminDecision =
        updatePayload.adminDecision;

      request.decisionDate =
        updatePayload.decisionDate;

      request.decisionBy =
        updatePayload.decisionBy;

      this.isProcessing.set(false);

      this.closeModal();
    }
  }

  // ================================
  // STATUS
  // ================================

  getStatusLabel(
    status: RemediationRequestStatus
  ): string {

    switch (status) {

      case 'Pending':
        return 'قيد المراجعة';

      case 'Approved':
        return 'مقبول';

      case 'Rejected':
        return 'مرفوض';

      case 'NeedsModification':
        return 'يحتاج إلى تعديل';

      default:
        return status;
    }
  }

  getStatusClass(
    status: RemediationRequestStatus
  ): string {

    switch (status) {

      case 'Pending':
        return 'st-pending';

      case 'Approved':
        return 'st-approved';

      case 'Rejected':
        return 'st-rejected';

      case 'NeedsModification':
        return 'st-modify';

      default:
        return '';
    }
  }

  // ================================
  // COUNTS
  // ================================

  getCountByStatus(
    status: RemediationRequestStatus
  ): number {

    return this.requests()
      .filter(request => request.status === status)
      .length;
  }
}