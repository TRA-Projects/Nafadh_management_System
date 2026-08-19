import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponseDto } from '../models/dtos';
import { RoleName } from '../models/enums';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'nafadh_session';

export interface Session {
  token: string;
  expiresAtUtc: string;
  userId: number;
  fullName: string;
  email: string;
  roleId: number;
  roleName: RoleName;
  // Only set when roleName is 'CompanySupervisor'.
  companyId?: number;
  supervisorId?: number;
}

// Shared across all four portals — real login against the .NET backend
// (POST /api/User/login), JWT stored and attached to every request via
// authInterceptor. No mock layer in this build.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private sessionSignal = signal<Session | null>(this.readFromStorage());

  readonly session = computed(() => this.sessionSignal());
  readonly isAuthenticated = computed(() => !!this.sessionSignal());
  readonly role = computed(() => this.sessionSignal()?.roleName ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponseDto> {
    return this.http
      .post<LoginResponseDto>(`${environment.apiBaseUrl}/User/login`, { email, password })
      .pipe(
        tap((res) => {
          const session: Session = {
            token: res.token,
            expiresAtUtc: res.expiresAtUtc,
            userId: res.userId,
            fullName: res.fullName,
            email: res.email,
            roleId: res.roleId,
            roleName: res.roleName,
            companyId: res.companyId,
            supervisorId: res.supervisorId,
          };
          this.sessionSignal.set(session);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        })
      );
  }

  logout(): void {
    this.sessionSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  get userId(): number | null {
    return this.sessionSignal()?.userId ?? null;
  }

  get companyId(): number | null {
    return this.sessionSignal()?.companyId ?? null;
  }

  get supervisorId(): number | null {
    return this.sessionSignal()?.supervisorId ?? null;
  }

  homeRouteForRole(role: RoleName): string {
    switch (role) {
      case 'Admin': return '/admin/dashboard';
      case 'CompanySupervisor': return '/company/dashboard';
      case 'Trainer': return '/trainer/dashboard';
      case 'Trainee': return '/trainee/dashboard';
      default: return '/login';
    }
  }

  private readFromStorage(): Session | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }
}
