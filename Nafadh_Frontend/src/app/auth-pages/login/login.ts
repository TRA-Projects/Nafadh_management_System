import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { LoginResponseDto } from '../../core/models/dtos';
import { LoginNotice, describeLoginError } from '../../portals/company/services/registration-messages';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  email = '';
  password = '';
  
  loading = signal<boolean>(false);
  notice = signal<LoginNotice | null>(null);

  private router = inject(Router);
  private authService = inject(AuthService);

  submit(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.notice.set(null);

    this.authService.login(this.email, this.password)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (res: LoginResponseDto) => {
          const targetRoute = this.authService.homeRouteForRole(res.roleName);
          this.router.navigate([targetRoute]);
        },
        error: (err: unknown) => {
          this.notice.set(describeLoginError(err));
        }
      });
  }
}