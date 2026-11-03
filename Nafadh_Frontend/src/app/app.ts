
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { SystemVariablesService } from './services/system-variables.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly systemVariables = inject(SystemVariablesService);
  private readonly title = inject(Title);

  ngOnInit(): void {
    
    this.systemVariables.getVariable('SiteName').subscribe({
      next: (variable) => {
        const siteName = variable.value?.trim();

        if (siteName) {
          this.title.setTitle(`${siteName} | Nafadh`);
        }
      },
      error: (error) => {
        console.error('تعذر تحميل اسم النظام:', error);
      }
    });
  }
}
