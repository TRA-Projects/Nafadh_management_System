
import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

import { NotificationTemplatesPageComponent } from './notification-templates-page.component';
import { EvaluationTemplatesComponent } from './evaluation-templates.component';

type TemplatesTab = 'notifications' | 'evaluations';

@Component({
  selector: 'app-templates-page',
  standalone: true,
  imports: [
    CommonModule,
    NotificationTemplatesPageComponent,
    EvaluationTemplatesComponent,
  ],
  templateUrl: './templates-page.component.html',
  styleUrl: './templates-page.component.css',
})
export class TemplatesPageComponent {
  readonly activeTab = signal<TemplatesTab>('notifications');

  selectTab(tab: TemplatesTab): void {
    this.activeTab.set(tab);
  }
}
