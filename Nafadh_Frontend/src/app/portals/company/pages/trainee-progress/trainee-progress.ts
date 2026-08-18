import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { EnrollmentDto, EvaluationDto, ProgressSummaryDto } from '../../../../core/models/dtos';
import { NfdIcon } from '../../../../shared/ui/icon/icon';

const STATUS_LABELS: Record<string, string> = { InProgress: 'نشط', Completed: 'مكتمل', Dropped: 'موقوف', Failed: 'متعثر' };
const STATUS_CHIP_CLASS: Record<string, string> = { InProgress: 'ok', Completed: 'info', Dropped: 'bad', Failed: 'warn' };

// Static training-period definitions, ported from the approved reference
// design — these four phases are the same for every trainee regardless of
// track (weights sum to 100%).
const PHASE_DEFS = [
  { n: 1, name: 'الاندماج والتأسيس', weight: 15, weeks: 'الأسابيع 1–8' },
  { n: 2, name: 'بناء المهارات', weight: 25, weeks: 'الأسابيع 9–16' },
  { n: 3, name: 'التطبيق العملي', weight: 30, weeks: 'الأسابيع 17–24' },
  { n: 4, name: 'المشروع النهائي والتقييم', weight: 30, weeks: 'الأسابيع 25–32' },
];

const AVATAR_PALETTE = ['#00338d', '#007cae', '#00bbc2', '#efbb20', '#1ebbf0', '#000692', '#5b6fb8', '#475569'];
const DONUT_R = 65;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

@Component({
  selector: 'app-company-trainee-progress',
  imports: [CommonModule, RouterLink, NfdIcon],
  templateUrl: './trainee-progress.html',
  styleUrl: './trainee-progress.scss',
})
export class CompanyTraineeProgress implements OnInit {
  enrollment = signal<EnrollmentDto | null>(null);
  evaluations = signal<EvaluationDto[]>([]);
  progressSummary = signal<ProgressSummaryDto | null>(null);
  phaseDefs = PHASE_DEFS;
  donutCirc = DONUT_CIRC;

  constructor(private route: ActivatedRoute, private api: CompanyApi) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getEnrollment(id).subscribe((d) => this.enrollment.set(d));
    this.api.getEvaluationsForEnrollment(id).subscribe((d) => this.evaluations.set(d ?? []));
    this.api.getProgressSummary(id).subscribe((d) => this.progressSummary.set(d));
  }

  // Each evaluation maps to one training period, in order.
  phases = computed(() => {
    const evals = this.evaluations();
    return this.phaseDefs.map((def, i) => {
      const ev = evals[i] ?? null;
      const status: 'done' | 'cur' | 'todo' = ev ? 'done' : (i === evals.length ? 'cur' : 'todo');
      return { def, ev, status };
    });
  });

  avgScore = computed(() => {
    const scored = this.evaluations().filter((e) => e.score > 0);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length);
  });

  donutOffset = computed(() => this.donutCirc * (1 - this.avgScore() / 100));
  currentPhaseLabel = computed(() => {
    const cur = this.phases().find((p) => p.status === 'cur');
    return cur ? 'الفترة ' + cur.def.n : 'مكتملة';
  });
  phasesDoneCount = computed(() => this.phases().filter((p) => p.status === 'done').length);
  pendingCount = computed(() => Math.max(0, 4 - this.evaluations().length));

  statusLabel(status?: string) { return status ? (STATUS_LABELS[status] ?? status) : '—'; }
  statusChipClass(status?: string) { return status ? (STATUS_CHIP_CLASS[status] ?? 'gray') : 'gray'; }

  initials(name?: string) {
    if (!name) return '؟';
    const parts = name.replace(' بن ', ' ').replace(' بنت ', ' ').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((w) => w.charAt(0)).join('');
  }

  avatarColor(name?: string) {
    if (!name) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[hash];
  }

  criterionPct(score: number, maxPoints: number) { return maxPoints ? Math.round((score / maxPoints) * 100) : 0; }
  padId(id: number) { return String(id).padStart(4, '0'); }
}
