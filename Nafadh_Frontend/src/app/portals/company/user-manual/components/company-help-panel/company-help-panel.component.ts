
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NfdIcon } from '../../../../../shared/ui/icon/icon';
import { HelpPanelData } from '../../models/company-help-panel.models';

@Component({
  selector: 'app-company-help-panel',
  standalone: true,
  imports: [CommonModule, NfdIcon],
  templateUrl: './company-help-panel.component.html',
  styleUrl: './company-help-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyHelpPanelComponent {
  readonly isOpen = input<boolean>(false);
  readonly data = input<HelpPanelData | null>(null);
  readonly pageKey = input<string>('');
  readonly close = output<void>();
  readonly startTour = output<void>();

  // ✅ هذا الـ Signal هو المسؤول عن فتح وإغلاق الأسئلة
  readonly openFaqIds = signal<Set<string>>(new Set());

  readonly hasContent = computed<boolean>(() => {
    const d = this.data();
    if (!d) return false;
    return Boolean(
      d.pageTitle ||
      d.pageDescription ||
      (d.sections && d.sections.length > 0) ||
      (d.faqs && d.faqs.length > 0)
    );
  });

  onClose(): void {
    this.close.emit();
  }
 toggleFaq(faqId: string): void {
    this.openFaqIds.update((current) => {
      // 1. نأخذ نسخة من الحالة الحالية
      const next = new Set(current);

      // 2. نعدل النسخة
      if (next.has(faqId)) {
        next.delete(faqId);
      } else {
        next.add(faqId);
      }

      // 3. ✅ السر هنا: نرجع Set جديد تماماً لضمان تغيير المرجع (Reference)
      return new Set(next);
    });
  }

  // ✅ دالة التحقق من الحالة
  isFaqOpen(faqId: string): boolean {
    return this.openFaqIds().has(faqId);
  }
}
