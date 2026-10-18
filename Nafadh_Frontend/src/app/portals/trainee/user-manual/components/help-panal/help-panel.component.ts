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
import { FormsModule } from '@angular/forms';
import { NfdIcon } from '../../../../../shared/ui/icon/icon';

import {
  HelpFaqItem,
  HelpPanelData,
  HelpSection,
} from '../../models/help-panel.models';

/**
 * لوحة المساعدة التفاعلية.
 *
 * - تستقبل البيانات من المكوّن الأب (UserManualShell).
 * - لا تعرف مصدر البيانات، ولا تستدعي أي API.
 * - Frontend-only search + FAQ Accordion.
 */
@Component({
  selector: 'app-help-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NfdIcon],
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

  /** نص البحث الحالي */
  readonly searchQuery = signal<string>('');

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

  /** نص البحث بعد التطبيع (trim + lowercase) */
  private readonly normalizedQuery = computed<string>(() =>
    this.searchQuery().trim().toLowerCase(),
  );

  /** هل البحث نشط؟ */
  readonly isSearching = computed<boolean>(
    () => this.normalizedQuery().length > 0,
  );

  /** الأقسام بعد الفلترة */
  readonly filteredSections = computed<HelpSection[]>(() => {
    const sections = this.data()?.sections ?? [];
    const q = this.normalizedQuery();

    if (!q) return sections;

    return sections
      .map((section) => this.filterSection(section, q))
      .filter((section): section is HelpSection => section !== null);
  });

  /** الأسئلة بعد الفلترة */
  readonly filteredFaqs = computed<HelpFaqItem[]>(() => {
    const faqs = this.data()?.faqs ?? [];
    const q = this.normalizedQuery();

    if (!q) return faqs;

    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q),
    );
  });

  /** هل الصفحة الحالية تطابق البحث؟ (للبحث في العنوان والوصف) */
  readonly pageHeaderMatches = computed<boolean>(() => {
    const d = this.data();
    const q = this.normalizedQuery();

    if (!d || !q) return true;

    return (
      (d.pageTitle ?? '').toLowerCase().includes(q) ||
      (d.pageDescription ?? '').toLowerCase().includes(q)
    );
  });

  /** هل يوجد نتائج بعد الفلترة؟ */
  readonly hasSearchResults = computed<boolean>(() => {
    if (!this.isSearching()) return true;

    return (
      this.pageHeaderMatches() ||
      this.filteredSections().length > 0 ||
      this.filteredFaqs().length > 0
    );
  });

  // =========================================================
  // Handlers
  // =========================================================

  onClose(): void {
    this.close.emit();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
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

  // =========================================================
  // Helpers
  // =========================================================

  /**
   * فلترة قسم واحد:
   * - يطابق العنوان أو الوصف → يُعاد كاملاً.
   * - يطابق أحد الخطوات → يُعاد مع الخطوات المطابقة فقط.
   * - لا يطابق → null (يُستبعد).
   */
  private filterSection(section: HelpSection, query: string): HelpSection | null {
    const titleMatch = (section.title ?? '').toLowerCase().includes(query);
    const descMatch = (section.description ?? '').toLowerCase().includes(query);

    if (titleMatch || descMatch) {
      return section;
    }

    const steps = section.steps ?? [];
    const matchingSteps = steps.filter((step) =>
      (step.text ?? '').toLowerCase().includes(query),
    );

    if (matchingSteps.length > 0) {
      return { ...section, steps: matchingSteps };
    }

    return null;
  }
}