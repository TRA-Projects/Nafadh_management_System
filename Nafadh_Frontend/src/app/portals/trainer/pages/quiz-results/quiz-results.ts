
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainerApi, QuizResultDto } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-results.html',
  styleUrl: './quiz-results.scss'
})
export class QuizResults implements OnInit {

  results = signal<QuizResultDto[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  quizId: number | undefined;

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('quizId');

    if (id !== null) {
      this.quizId = Number(id);
    }

    const userId = this.auth.session()?.userId;

    if (!userId) {
      this.errorMessage.set('تعذر تحديد المستخدم الحالي.');
      return;
    }

    this.loading.set(true);

    this.api.getTrainerByUserId(userId).subscribe({
      next: trainer => {
        this.api.getTrainerQuizResults(
          trainer.trainerId,
          this.quizId
        ).subscribe({
          next: data => {
            this.results.set(data ?? []);
            this.loading.set(false);
          },
          error: () => {
            this.errorMessage.set('تعذر تحميل نتائج الاختبار.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.errorMessage.set('تعذر تحميل بيانات المدرب.');
        this.loading.set(false);
      }
    });
  }
  
goBack(): void {
  this.router.navigate(['/trainer/quizzes']);
}

}
