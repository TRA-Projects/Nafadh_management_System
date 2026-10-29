import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import {
  TrainerApi,
  TrainerLivePoll,
  TrainerLivePollResultsResponse,
} from '../../services/trainer-api';

@Component({
  selector: 'app-trainer-live-polls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-poll.html',
  styleUrl: './live-poll.scss',
})
export class TrainerLivePollsComponent implements OnInit {
  sessionId!: number; // معرف الجلسة من الرابط

  polls = signal<TrainerLivePoll[]>([]);
  selectedResults = signal<TrainerLivePollResultsResponse | null>(null);
  selectedPollId = signal<number | null>(null);

  // هيكل لدعم إضافة أسئلة متعددة ديناميكياً (للتقييم أو الاستطلاعات)
  pollForms = signal<Array<{ question: string; optionDrafts: string[] }>>([
    { question: '', optionDrafts: ['', ''] }
  ]);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private trainerApi: TrainerApi,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('sessionId') || params.get('id') || this.route.snapshot.paramMap.get('sessionId');
      this.sessionId = Number(id) || Number(this.route.snapshot.queryParams['batchId']) || 429;
      
      if (this.sessionId) {
        this.loadPolls();
      }
    });
  }

  // إضافة سؤال جديد للنموذج
  addQuestionDraft(): void {
    this.pollForms.update(forms => [
      ...forms,
      { question: '', optionDrafts: ['', ''] }
    ]);
  }

  // حذف سؤال من النموذج
  removeQuestionDraft(index: number): void {
    if (this.pollForms().length > 1) {
      this.pollForms.update(forms => forms.filter((_, i) => i !== index));
    }
  }

  // إضافة خيار داخل سؤال معين
  addOptionToQuestion(qIndex: number): void {
    this.pollForms.update(forms => {
      const updated = [...forms];
      if (updated[qIndex].optionDrafts.length < 10) {
        updated[qIndex].optionDrafts.push('');
      }
      return updated;
    });
  }

  // حذف خيار من سؤال معين
  removeOptionFromQuestion(qIndex: number, optIndex: number): void {
    this.pollForms.update(forms => {
      const updated = [...forms];
      if (updated[qIndex].optionDrafts.length > 2) {
        updated[qIndex].optionDrafts.splice(optIndex, 1);
      }
      return updated;
    });
  }

  // إرسال جميع الأسئلة المصممة دفعة واحدة
  createAllPolls(): void {
    this.clearMessages();
    
    const forms = this.pollForms();
    
    for (let i = 0; i < forms.length; i++) {
      const q = forms[i].question.trim();
      const opts = forms[i].optionDrafts.map(o => o.trim()).filter(o => o.length > 0);
      
      if (!q) {
        this.errorMessage.set(`يرجى كتابة نص السؤال رقم ${i + 1}.`);
        return;
      }
      if (opts.length < 2) {
        this.errorMessage.set(`السؤال رقم ${i + 1} يجب أن يحتوي على خيارين على الأقل.`);
        return;
      }
    }

    this.saving.set(true);

    let completed = 0;
    let hasError = false;

    forms.forEach((form) => {
      const question = form.question.trim();
      const options = form.optionDrafts.map(o => o.trim()).filter(o => o.length > 0);

      this.trainerApi.createTrainerLivePoll(this.sessionId, { question, options }).subscribe({
        next: () => {
          completed++;
          if (completed === forms.length && !hasError) {
            this.successMessage.set('تم إنشاء ونشر جميع أسئلة التقييم بنجاح.');
            this.saving.set(false);
            this.pollForms.set([{ question: '', optionDrafts: ['', ''] }]);
            this.loadPolls();
          }
        },
        error: (error: HttpErrorResponse) => {
          if (!hasError) {
            hasError = true;
            console.error('Create poll failed:', error);
            this.errorMessage.set(error?.error?.message ?? 'تعذر إنشاء بعض الأسئلة.');
            this.saving.set(false);
          }
        }
      });
    });
  }

  loadPolls(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.trainerApi.getTrainerLivePolls(this.sessionId).subscribe({
      next: (response) => {
        this.polls.set(response.polls ?? []);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Load polls failed:', error);
        this.errorMessage.set(
          error?.error?.message ?? 'تعذر تحميل استطلاعات الجلسة.',
        );
        this.loading.set(false);
      },
    });
  }

  openPoll(poll: TrainerLivePoll): void {
    this.clearMessages();

    this.trainerApi
      .openTrainerLivePoll(this.sessionId, poll.pollId)
      .subscribe({
        next: () => {
          this.successMessage.set('تم فتح التصويت للمتدربين.');
          this.loadPolls();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Open poll failed:', error);
          this.errorMessage.set(
            error?.error?.message ?? 'تعذر فتح التصويت.',
          );
        },
      });
  }

  closePoll(poll: TrainerLivePoll): void {
    this.clearMessages();

    this.trainerApi
      .closeTrainerLivePoll(this.sessionId, poll.pollId)
      .subscribe({
        next: () => {
          this.successMessage.set('تم إغلاق الاستطلاع.');
          this.loadPolls();
          this.loadResults(poll.pollId);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Close poll failed:', error);
          this.errorMessage.set(
            error?.error?.message ?? 'تعذر إغلاق الاستطلاع.',
          );
        },
      });
  }

  loadResults(pollId: number): void {
    this.selectedPollId.set(pollId);
    this.selectedResults.set(null);

    this.trainerApi
      .getTrainerLivePollResults(this.sessionId, pollId)
      .subscribe({
        next: (results) => {
          const mappedResults = {
            ...results,
            results: results.results.map((item: any) => ({
              ...item,
              votePercentage: item.votePercentage ?? item.percentage ?? 0
            }))
          };
          this.selectedResults.set(mappedResults);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load poll results failed:', error);
          this.errorMessage.set(
            error?.error?.message ?? 'تعذر تحميل نتائج التصويت.',
          );
        },
      });
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}