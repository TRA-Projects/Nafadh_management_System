import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-company-specialties',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './specialties.html',
  styleUrl: './specialties.scss',
})
export class CompanySpecialties implements OnInit {
  companyId: number = 0;
  
  loading = signal(false);
  error = signal('');
  cards = signal<any[]>([]);

  approvedCount = computed(() => this.cards().length);
  
  totalCapacity = computed(() => 
    this.cards().reduce((sum, c) => sum + (c.totalCapacity ?? c.capacity ?? 0), 0)
  );

  usedCapacity = computed(() => 
    this.cards().reduce((sum, c) => sum + (c.usedCapacity ?? c.used ?? 0), 0)
  );

  occupancyPercent = computed(() => {
    const total = this.totalCapacity();
    if (!total) return 0;
    return Math.round((this.usedCapacity() / total) * 100);
  });

  activePlans = computed(() => 
    this.cards().filter((c) => c.isActive || c.status === 'Active' || true).length
  );

  constructor(private api: CompanyApi, private auth: AuthService) {
    this.companyId = this.auth.companyId ?? 0;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getCompanyPrograms(this.companyId).subscribe({
      next: (d) => {
        this.cards.set(d ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('تعذر تحميل البيانات بنجاح.');
        this.loading.set(false);
      },
    });
  }

  trackByProgramId(index: number, card: any): any {
    return card.id ?? card.programId ?? index;
  }

  openDetails(card: any): void {
    console.log('Open details for:', card);
  }
}