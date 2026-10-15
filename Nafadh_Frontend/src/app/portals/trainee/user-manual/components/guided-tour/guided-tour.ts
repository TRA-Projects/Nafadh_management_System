
import { Component, Input } from '@angular/core';

// Defines the data required for each tour step
export interface GuidedTourStep {
  element: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-guided-tour',
  imports: [],
  templateUrl: './guided-tour.html',
  styleUrl: './guided-tour.scss',
})
export class GuidedTour {

  // Receive tour steps from the parent component
  @Input() steps: GuidedTourStep[] = [];

}
