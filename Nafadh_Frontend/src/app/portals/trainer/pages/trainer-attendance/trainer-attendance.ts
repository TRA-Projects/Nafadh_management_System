import { ChangeDetectorRef, Component, OnInit } from '@angular/core'; import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';

@Component({
    selector: 'app-trainer-attendance',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './trainer-attendance.html',
    styleUrl: './trainer-attendance.scss'
})
export class TrainerAttendance implements OnInit {

    attendance: any[] = [];
    loading = false;
    error = '';
    excuseWindow: { [key: number]: boolean } = {};

    constructor(
        private trainerApi: TrainerApi,
        private cdr: ChangeDetectorRef
    ) { }
    
    ngOnInit(): void {
        this.loadAttendance();
    }

    loadAttendance(): void {
    this.loading = true;
    this.error = '';

    this.trainerApi.getMyTrainerAttendance().subscribe({
        next: (data) => {
    this.attendance = data;

    this.attendance.forEach(item => {
        if (item.reason) {
            this.checkExcuseWindow(item);
        }
    });

    this.loading = false;
    this.cdr.detectChanges();
},
        error: (err) => {
            console.error('Failed to load trainer attendance:', err);
            this.error = 'تعذر تحميل سجل الحضور.';
            this.loading = false;
            this.cdr.detectChanges();
        }
    });
}
    checkExcuseWindow(item: any): void {
    this.trainerApi.isExcuseWindowOpen(item.trainerAttendanceId).subscribe({
        next: (result) => {
            this.excuseWindow[item.trainerAttendanceId] = result.isOpen;
            this.cdr.detectChanges();
        },
        error: () => {
            this.excuseWindow[item.trainerAttendanceId] = false;
            this.cdr.detectChanges();
        }
    });
}
    uploadProof(item: any, event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        const formData = new FormData();
        formData.append('File', file);

        this.trainerApi.uploadTrainerAttendanceProof(
            item.trainerAttendanceId,
            formData
        ).subscribe({
            next: (response: any) => {
                item.excuseProofUrl = response.excuseProofUrl;
            },
            error: (err) => {
                console.error('Failed to upload attendance proof:', err);

                if (err.status === 409) {
                    this.error = err.error?.message
                        || 'انتهت فترة تقديم العذر لهذا الأسبوع.';
                } else {
                    this.error = 'تعذر رفع إثبات العذر.';
                }
            }
        });
    }
    submitExcuse(item: any): void {
        const reason = item._excuseDraft?.trim();

        if (!reason) return;

        this.trainerApi.submitTrainerAttendanceExcuse(
            item.trainerAttendanceId,
            reason
        ).subscribe({
            next: (response: any) => {
                item.reason = response.reason;
                item.excuseReviewStatus = response.excuseReviewStatus;
                item._excuseDraft = '';
            },
            error: (err) => {
                console.error('Failed to submit excuse:', err);

                if (err.status === 409) {
                    this.error = 'انتهت فترة تقديم العذر لهذا الأسبوع، ولا يمكن إرسال الملاحظة حاليًا.';
                } else {
                    this.error = 'تعذر حفظ ملاحظة العذر.';
                }
            }
        });
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'Present':
                return 'حاضر';
            case 'Late':
                return 'متأخر';
            case 'Absent':
                return 'غائب';
            case 'Excused':
                return 'بعذر';
            default:
                return status;
        }
    }
    getStatusCount(status: string): number {
        return this.attendance.filter(item => item.status === status).length;
    }
    getExcuseStatusLabel(status: string): string {
        switch (status) {
            case 'Pending':
                return 'قيد المراجعة';
            case 'Approved':
                return 'مقبول';
            case 'Rejected':
                return 'مرفوض';
            default:
                return status;
        }
    }

}