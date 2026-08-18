import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';
import { EvaluationCriterionDto, EvaluationTemplateDetailDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainer-trainees',
   standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainees.html',
  styleUrl: './trainees.scss',
})
export class TrainerTrainees implements OnInit {
  companyId = 1;
  enrollments = signal<any[]>([]);
  showEvalModal = signal(false);
  templateDetail = signal<EvaluationTemplateDetailDto | null>(null);
  selectedModuleId = 1;
  selectedStage = 1;
  selectedEnrollmentId: number | null = null;
  criteriaScores: Record<number, number> = {};
  showAddCriterion = signal(false);
  newCriterion = { name: '', weight: 0, maxPoints: 0 };

  constructor(private api: TrainerApi) {}

  ngOnInit() { this.api.getEnrollments(this.companyId).subscribe((d) => this.enrollments.set(d ?? [])); }

  loadTemplates() {
    this.api.getEvaluationTemplates(this.selectedModuleId, this.selectedStage).subscribe((templates) => {
      const first = templates?.[0];
      if (first) {
        this.api.getTemplateDetail(first.templateId).subscribe((detail) => this.templateDetail.set(detail));
      } else {
        this.templateDetail.set(null);
      }
      this.criteriaScores = {};
    });
  }

  openEval(enrollmentId: number) {
    this.selectedEnrollmentId = enrollmentId;
    this.loadTemplates();
    this.showEvalModal.set(true);
  }

  criteria(): EvaluationCriterionDto[] { return this.templateDetail()?.criteria ?? []; }

  addCriterion() {
    const templateId = this.templateDetail()?.templateId;
    if (!templateId) return;
    this.api.createCriterion({ templateId, name: this.newCriterion.name, weight: this.newCriterion.weight, maxPoints: this.newCriterion.maxPoints }).subscribe(() => {
      this.showAddCriterion.set(false);
      this.newCriterion = { name: '', weight: 0, maxPoints: 0 };
      this.api.getTemplateDetail(templateId).subscribe((detail) => this.templateDetail.set(detail));
    });
  }

  submitEvaluation() {
    if (!this.selectedEnrollmentId || !this.templateDetail()) return;
    const criteriaScores = Object.entries(this.criteriaScores).map(([criteriaId, score]) => ({ criteriaId: Number(criteriaId), score }));
    this.api.submitEvaluation({
      enrollmentId: this.selectedEnrollmentId, trainerId: 1, templateId: this.templateDetail()!.templateId,
      evaluatorUserId: 1, criteriaScores,
    }).subscribe(() => {
      this.showEvalModal.set(false);
      this.criteriaScores = {};
    });
  }
}
