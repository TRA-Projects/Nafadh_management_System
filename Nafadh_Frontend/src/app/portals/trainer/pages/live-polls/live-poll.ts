import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
export class TrainerLivePollsComponent implements OnChanges {
  // سيُمرر معرّف الجلسة لاحقًا من الصفحة التي تختار الجلسة.
  @Input({ required: true }) sessionId!: number;

  polls = signal<TrainerLivePoll[]>([]);
  selectedResults = signal<TrainerLivePollResultsResponse | null>(null);
  selectedPollId = signal<number | null>(null);

  question = '';
  optionDrafts = ['', ''];

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(private trainerApi: TrainerApi) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sessionId'] && this.sessionId > 0) {
      this.loadPolls();
    }
  }

  addOption(): void {
    if (this.optionDrafts.length < 10) {
      this.optionDrafts.push('');
    }
  }

  removeOption(index: number): void {
    if (this.optionDrafts.length > 2) {
      this.optionDrafts.splice(index, 1);
    }
  }

  createPoll(): void {
    this.clearMessages();

    const question = this.question.trim();
    const options = this.optionDrafts
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    if (!question) {
      this.errorMessage.set('اكتبي سؤال الاستطلاع.');
      return;
    }

    if (options.length < 2) {
      this.errorMessage.set('أضيفي خيارين على الأقل.');
      return;
    }

    if (options.length > 10) {
      this.errorMessage.set('الحد الأعلى هو 10 خيارات.');
      return;
    }

    this.saving.set(true);

    this.trainerApi
      .createTrainerLivePoll(this.sessionId, { question, options })
      .subscribe({
        next: () => {
          this.question = '';
          this.optionDrafts = ['', ''];
          this.successMessage.set('تم إنشاء الاستطلاع كمسودة.');
          this.saving.set(false);
          this.loadPolls();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Create poll failed:', error);
          this.errorMessage.set(
            error?.error?.message ?? 'تعذر إنشاء الاستطلاع.',
          );
          this.saving.set(false);
        },
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
          this.successMessage.set('تم نشر الاستطلاع وفتح التصويت.');
          this.loadPolls();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Open poll failed:', error);
          this.errorMessage.set(
            error?.error?.message ?? 'تعذر نشر الاستطلاع.',
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
        next: (results) => this.selectedResults.set(results),
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