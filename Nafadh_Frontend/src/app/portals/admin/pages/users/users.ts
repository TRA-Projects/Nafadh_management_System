import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { UserResponseDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
})
export class AdminUsers implements OnInit {
  users = signal<UserResponseDto[]>([]);
  roleFilter = signal('الكل');
  showCreate = signal(false);
  newUser = { fullName: '', email: '', phone: '', roleId: 1, password: '' };

  constructor(private api: AdminApi) {}
  ngOnInit() { this.load(); }
  load() { this.api.getUsers().subscribe((d) => this.users.set(d)); }

  filtered() {
    const r = this.roleFilter();
    if (r === 'الكل') return this.users();
    return this.users().filter((u) => u.roleName === r);
  }

  createUser() {
    this.api.createUser(this.newUser).subscribe(() => {
      this.showCreate.set(false);
      this.newUser = { fullName: '', email: '', phone: '', roleId: 1, password: '' };
      this.load();
    });
  }

  toggleStatus(u: UserResponseDto) {
    const next = u.status === 'Active' ? 'Suspended' : 'Active';
    this.api.updateUserStatus(u.userId, next).subscribe(() => this.load());
  }
}
