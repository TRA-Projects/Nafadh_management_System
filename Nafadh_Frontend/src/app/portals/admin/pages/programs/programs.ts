import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApi } from '../../services/admin-api';
import { BatchDto, ProgramDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-programs',
  imports: [CommonModule],
  templateUrl: './programs.html',
})
export class AdminPrograms implements OnInit {
  batches = signal<BatchDto[]>([]);
  programs = signal<ProgramDto[]>([]);
  statusFilter = signal('الكل');

  constructor(private api: AdminApi) {}
  ngOnInit() {
    this.api.getBatches().subscribe((d) => this.batches.set(d));
    this.api.getPrograms().subscribe((d) => this.programs.set(d));
  }

  filtered() {
    const f = this.statusFilter();
    if (f === 'الكل') return this.batches();
    return this.batches().filter((b) => b.status === f);
  }
}
