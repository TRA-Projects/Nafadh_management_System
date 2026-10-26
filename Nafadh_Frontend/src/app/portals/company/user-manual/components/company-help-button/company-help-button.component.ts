
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NfdIcon } from '../../../../../shared/ui/icon/icon';

/**
 * زر المساعدة العائم.
 *
 * - يستقبل حالة الفتح من المكوّن الأب.
 * - يُصدر حدث toggle عند الضغط.
 * - لا يعرف أي شيء عن GuideService.
 */
@Component({
  selector: 'app-company-help-button',
  standalone: true,
  imports: [CommonModule, NfdIcon],
  templateUrl: './company-help-button.component.html',
  styleUrl: './company-help-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyHelpButtonComponent {
  /** حالة فتح لوحة المساعدة */
  readonly isOpen = input<boolean>(false);

  /** يُصدر عند الضغط على الزر */
  readonly toggle = output<void>();

  onToggle(): void {
    this.toggle.emit();
  }
}