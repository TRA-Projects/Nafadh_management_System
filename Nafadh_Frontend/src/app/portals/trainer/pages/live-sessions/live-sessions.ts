
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-trainer-live-sessions',
  standalone: true,
  imports: [],
  templateUrl: './live-sessions.html',
  styleUrl: './live-sessions.scss'
})
export class TrainerLiveSessions {

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  batchId = Number(
    this.route.snapshot.queryParamMap.get('batchId') ?? 0
  );

  goBack(): void {
    this.router.navigate(['/trainer/content'], {
      queryParams: { batchId: this.batchId }
    });
  }
}
