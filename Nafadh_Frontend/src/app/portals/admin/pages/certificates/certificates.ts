import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApi } from '../../services/admin-api';
import { CertificateDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-certificates',
  imports: [CommonModule],
  templateUrl: './certificates.html',
})
export class AdminCertificates implements OnInit {
  certificates = signal<CertificateDto[]>([]);
  traineeIdInput = 1;

  constructor(private api: AdminApi) {}
  ngOnInit() { this.load(); }
  load() { this.api.getCertificatesByTrainee(this.traineeIdInput).subscribe((d) => this.certificates.set(d)); }
}
