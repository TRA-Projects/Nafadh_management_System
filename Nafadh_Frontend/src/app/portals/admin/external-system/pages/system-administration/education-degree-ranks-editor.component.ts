/// <reference types="@angular/localize" />

import { CommonModule } from '@angular/common';
import { Component, effect, input, signal } from '@angular/core';

import {
  parseEducationDegreeRanks,
  serializeEducationDegreeRanks,
  type EducationDegreeRankLevel,
}  from '../../legacy/core/system/education-degree-ranks.util';

interface RankDraft {
  labels: string[];
  draft: string;
}

@Component({
  selector: 'app-education-degree-ranks-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './education-degree-ranks-editor.component.html',
  styleUrl: './education-degree-ranks-editor.component.scss',
})
export class EducationDegreeRanksEditorComponent {
  readonly json = input('');

  readonly levels = signal<RankDraft[]>([]);
  readonly error = signal('');

  readonly addRankLabel = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.addRank:Add rank`;
  readonly addLabelLabel = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.addLabel:Add`;
  readonly removeRankLabel = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.removeRank:Remove`;
  readonly moveUpLabel = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.moveUp:Up`;
  readonly moveDownLabel = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.moveDown:Down`;
  readonly removeLabelAria = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.removeLabel:Remove label`;
  readonly labelPlaceholder = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.labelPlaceholder:Label`;
  readonly emptyRanksError = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.emptyRanks:Add at least one rank.`;
  readonly emptyLabelsError = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.emptyLabels:Each rank needs at least one label.`;
  readonly invalidJsonError = $localize`:@@jobseeker.admin.systemConfig.degreeRanks.invalidJson:Could not load ranks.`;

  constructor() {
    effect(() => {
      this.load(this.json());
    });
  }

  rankHeading(index: number): string {
    const n = index + 1;
    return $localize`:@@jobseeker.admin.systemConfig.degreeRanks.rankHeading:Rank ${n}:RANK:`;
  }

  load(json: string): void {
    const parsed = parseEducationDegreeRanks(json);
    if (parsed == null) {
      this.levels.set([]);
      this.error.set(this.invalidJsonError);
      return;
    }
    this.levels.set(
      parsed.map((row) => ({
        labels: [...row.labels],
        draft: '',
      }))
    );
    this.error.set('');
  }

  serialize(): string {
    return serializeEducationDegreeRanks(this.toLevels());
  }

  isValid(): boolean {
    const rows = this.levels();
    if (rows.length === 0) {
      this.error.set(this.emptyRanksError);
      return false;
    }
    if (rows.some((row) => row.labels.length === 0)) {
      this.error.set(this.emptyLabelsError);
      return false;
    }
    this.error.set('');
    return true;
  }

  addRank(): void {
    this.levels.update((rows) => [...rows, { labels: [], draft: '' }]);
    this.error.set('');
  }

  removeRank(index: number): void {
    this.levels.update((rows) => rows.filter((_, i) => i !== index));
  }

  moveUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.swap(index, index - 1);
  }

  moveDown(index: number): void {
    if (index >= this.levels().length - 1) {
      return;
    }
    this.swap(index, index + 1);
  }

  setDraft(index: number, value: string): void {
    this.levels.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, draft: value } : row))
    );
  }

  addLabel(index: number): void {
    const row = this.levels()[index];
    if (!row) {
      return;
    }
    const next = row.draft.trim();
    if (!next) {
      return;
    }
    const exists = row.labels.some((label) => label.toLowerCase() === next.toLowerCase());
    this.levels.update((rows) =>
      rows.map((item, i) => {
        if (i !== index) {
          return item;
        }
        return {
          labels: exists ? item.labels : [...item.labels, next],
          draft: '',
        };
      })
    );
    this.error.set('');
  }

  removeLabel(rankIndex: number, labelIndex: number): void {
    this.levels.update((rows) =>
      rows.map((row, i) =>
        i === rankIndex
          ? { ...row, labels: row.labels.filter((_, j) => j !== labelIndex) }
          : row
      )
    );
  }

  private swap(a: number, b: number): void {
    this.levels.update((rows) => {
      const next = [...rows];
      const tmp = next[a];
      next[a] = next[b];
      next[b] = tmp;
      return next;
    });
  }

  private toLevels(): EducationDegreeRankLevel[] {
    return this.levels().map((row, i) => ({
      rank: i + 1,
      labels: row.labels,
    }));
  }
}
