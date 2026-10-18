// src/app/features/trainee/user-manual/components/help-panel/help-panel.component.ts

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

import { HelpPanelData } from '../../models/help-panel.models';

/**
 * لوحة المساعدة التفاعلية.
 *
 * - تستقبل البيانات من المكوّن الأب (UserManualShell).
 * - لا تعرف مصدر البيانات، ولا تستدعي أي API.
 * - FAQ Accordion فقط.
 */
@Component({
  selector: 'app-help-panel',
  standalone: true,
  imports: [CommonModule, NfdIcon],
  templateUrl: './help-panel.component.html',
  styleUrl: './help-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpPanelComponent {
  // =========================================================
  // Inputs
  // =========================================================

  /** هل اللوحة مفتوحة؟ */
  readonly isOpen = input<boolean>(false);

  /** بيانات المساعدة القادمة من المكوّن الأب */
  readonly data = input<HelpPanelData | null>(null);

  /** مفتاح الصفحة الحالية (للعرض فقط) */
  readonly pageKey = input<string>('');

  // =========================================================
  // Outputs
  // =========================================================

  /** يُصدر عند الضغط على زر الإغلاق */
  readonly close = output<void>();

  // =========================================================
  // Local UI State
  // =========================================================

  /** مجموعة معرّفات الأسئلة المفتوحة حالياً (Accordion) */
  readonly openFaqIds = signal<Set<string>>(new Set());

  // =========================================================
  // Computed
  // =========================================================

  /** هل يوجد محتوى لعرضه؟ */
  readonly hasContent = computed<boolean>(() => {
    const d = this.data();
    if (!d) return false;

    return Boolean(
      d.pageTitle ||
      d.pageDescription ||
      (d.sections && d.sections.length > 0) ||
      (d.faqs && d.faqs.length > 0),
    );
  });

  // =========================================================
  // Handlers
  // =========================================================

  onClose(): void {
    this.close.emit();
  }

  /** Toggle سؤال في الـ FAQ */
  toggleFaq(faqId: string): void {
    this.openFaqIds.update((current) => {
      const next = new Set(current);
      if (next.has(faqId)) {
        next.delete(faqId);
      } else {
        next.add(faqId);
      }
      return next;
    });
  }

  /** هل السؤال مفتوح؟ */
  isFaqOpen(faqId: string): boolean {
    return this.openFaqIds().has(faqId);
  }
}