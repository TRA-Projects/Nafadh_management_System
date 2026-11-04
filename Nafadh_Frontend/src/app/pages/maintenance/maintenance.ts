
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.scss',
})
export class Maintenance {
  message = 'النظام تحت الصيانة حاليًا. يرجى المحاولة لاحقًا.';

  constructor(private router: Router) {
    const state = this.router.getCurrentNavigation()?.extras.state
      ?? history.state;

    if (typeof state?.['message'] === 'string') {
      this.message = state['message'];
    }
  }
}
