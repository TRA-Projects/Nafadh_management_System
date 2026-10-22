
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  DEFAULT_EDUCATION_DEGREE_RANKS,
  EducationDegreeRankLevel,
  parseEducationDegreeRanks,
  serializeEducationDegreeRanks,
} from '../../legacy/core/system/education-degree-ranks.util';

interface EducationDegreeRankEditorLevel extends EducationDegreeRankLevel {
  draft: string;
}

@Component({
  selector: 'app-education-degree-ranks-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './education-degree-ranks-editor.component.html',
  styleUrl: './education-degree-ranks-editor.component.scss',
})
export class EducationDegreeRanksEditorComponent implements OnChanges {
  @Input() json = '';

  readonly levels = signal<EducationDegreeRankEditorLevel[]>([]);
  readonly error = signal('');

  readonly moveUpLabel = 'تحريك للأعلى';
  readonly moveDownLabel = 'تحريك للأسفل';
  readonly removeRankLabel = 'حذف المستوى';
  readonly removeLabelAria = 'حذف التسمية';
  readonly labelPlaceholder = 'أدخلي تسمية جديدة';
  readonly addLabelLabel = 'إضافة تسمية';
  readonly addRankLabel = 'إضافة مستوى جديد';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['json']) {
      this.loadLevels(this.json);
    }
  }

  private loadLevels(json: string | null | undefined): void {
    this.error.set('');

    const raw = (json ?? '').trim();

    if (!raw) {
      this.levels.set(
        DEFAULT_EDUCATION_DEGREE_RANKS.map((level) => ({
          rank: level.rank,
          labels: [...level.labels],
          draft: '',
        })),
      );
      return;
    }

    const parsed = parseEducationDegreeRanks(raw);

    if (parsed === null) {
      this.levels.set([]);
      this.error.set(
        'تعذر قراءة بيانات درجات المؤهل التعليمي. تحققي من صيغة البيانات.',
      );
      return;
    }

    this.levels.set(
      parsed.map((level) => ({
        rank: level.rank,
        labels: [...level.labels],
        draft: '',
      })),
    );
  }

  rankHeading(index: number): string {
    return `المستوى ${index + 1}`;
  }

  setDraft(index: number, value: string): void {
    this.levels.update((levels) =>
      levels.map((level, i) =>
        i === index ? { ...level, draft: value } : level,
      ),
    );

    this.error.set('');
  }

  addLabel(index: number): void {
    const level = this.levels()[index];

    if (!level) {
      return;
    }

    const label = level.draft.trim();

    if (!label) {
      this.error.set('أدخلي التسمية قبل إضافتها.');
      return;
    }

    const duplicate = level.labels.some(
      (existing) =>
        existing.trim().toLocaleLowerCase() ===
        label.toLocaleLowerCase(),
    );

    if (duplicate) {
      this.error.set('هذه التسمية موجودة بالفعل في المستوى نفسه.');
      return;
    }

    this.levels.update((levels) =>
      levels.map((item, i) =>
        i === index
          ? {
              ...item,
              labels: [...item.labels, label],
              draft: '',
            }
          : item,
      ),
    );

    this.error.set('');
  }

  removeLabel(levelIndex: number, labelIndex: number): void {
    this.levels.update((levels) =>
      levels.map((level, i) =>
        i === levelIndex
          ? {
              ...level,
              labels: level.labels.filter((_, j) => j !== labelIndex),
            }
          : level,
      ),
    );

    this.error.set('');
  }

  addRank(): void {
    this.levels.update((levels) => [
      ...levels,
      {
        rank: levels.length + 1,
        labels: [],
        draft: '',
      },
    ]);

    this.error.set('');
  }

  removeRank(index: number): void {
    this.levels.update((levels) =>
      levels
        .filter((_, i) => i !== index)
        .map((level, i) => ({
          ...level,
          rank: i + 1,
        })),
    );

    this.error.set('');
  }

  moveUp(index: number): void {
    if (index <= 0) {
      return;
    }

    this.moveRank(index, index - 1);
  }

  moveDown(index: number): void {
    if (index >= this.levels().length - 1) {
      return;
    }

    this.moveRank(index, index + 1);
  }

  private moveRank(from: number, to: number): void {
    this.levels.update((levels) => {
      const reordered = [...levels];
      const [moved] = reordered.splice(from, 1);

      if (!moved) {
        return levels;
      }

      reordered.splice(to, 0, moved);

      return reordered.map((level, index) => ({
        ...level,
        rank: index + 1,
      }));
    });

    this.error.set('');
  }

  isValid(): boolean {
    if (this.error()) {
      return false;
    }

    const levels = this.levels();

    if (levels.length === 0) {
      this.error.set('أضيفي مستوى واحدًا على الأقل.');
      return false;
    }

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];

      if (level.draft.trim()) {
        this.error.set(
          `أضيفي التسمية المكتوبة في ${this.rankHeading(i)} أو امسحيها قبل الحفظ.`,
        );
        return false;
      }

      if (level.labels.length === 0) {
        this.error.set(
          `أضيفي تسمية واحدة على الأقل إلى ${this.rankHeading(i)} أو احذفي المستوى.`,
        );
        return false;
      }

      const uniqueLabels = new Set(
        level.labels.map((label) => label.trim().toLocaleLowerCase()),
      );

      if (uniqueLabels.size !== level.labels.length) {
        this.error.set(
          `توجد تسميات مكررة في ${this.rankHeading(i)}.`,
        );
        return false;
      }
    }

    this.error.set('');
    return true;
  }

  serialize(): string {
    return serializeEducationDegreeRanks(
      this.levels().map((level) => ({
        rank: level.rank,
        labels: level.labels,
      })),
    );
  }
}
