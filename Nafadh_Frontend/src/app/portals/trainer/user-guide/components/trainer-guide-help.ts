
import { Component, inject } from '@angular/core';
import { TrainerGuideService } from '../services/trainer-guide.service';

@Component({
  selector: 'app-trainer-guide-help',
  standalone: true,
  templateUrl: './trainer-guide-help.html',
  styleUrl: './trainer-guide-help.scss'
})
export class TrainerGuideHelp {
  readonly guideService = inject(TrainerGuideService);

  toggleHelp(): void {
    if (this.guideService.isHelpOpen()) {
      this.guideService.closeHelp();
    } else {
      this.guideService.openHelp();
    }
  }

  startTour(): void {
    this.guideService.closeHelp();
    this.guideService.startTour();
  }
}
