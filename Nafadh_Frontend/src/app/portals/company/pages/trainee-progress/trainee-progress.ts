import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { EvaluationDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-trainee-progress',
  imports: [CommonModule, RouterLink],
  templateUrl: './trainee-progress.html',
})
export class CompanyTraineeProgress implements OnInit {
  evaluations = signal<EvaluationDto[]>([]);
  stages = [1, 2, 3, 4];

  constructor(private route: ActivatedRoute, private api: CompanyApi) {}
  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getEvaluationsForEnrollment(id).subscribe((d) => this.evaluations.set(d ?? []));
  }
}
