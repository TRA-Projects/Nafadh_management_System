import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { SystemVariablesService } from './services/system-variables.service';
import { AuthService } from './core/auth/auth.service';
import { NafadhConstantsService } from './core/services/nafadh-constants.service';

import {
  EVALUATION_TYPE_LABELS,
  WARNING_TYPE_LABELS
} from './core/models/enums';

import { APPROVAL_LABELS } from './portals/company/models/company-tasks.models';

/** Existing shared label maps → the Nafadh constants group that owns their values. */
const LIVE_LABEL_MAPS: ReadonlyArray<readonly [string, Record<string, string>]> = [
  ['NFD_WRN_TYPE', WARNING_TYPE_LABELS],
  ['NFD_EVL_TYPE', EVALUATION_TYPE_LABELS],
  ['NFD_CPA_STAT', APPROVAL_LABELS],
];
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly systemVariables = inject(SystemVariablesService);
  private readonly title = inject(Title);

  constructor() {
    const auth = inject(AuthService);
    const constants = inject(NafadhConstantsService);

    for (const [group, map] of LIVE_LABEL_MAPS) {
      constants.bindLabelMap(group, map);
    }

    // تحميل الثوابت بعد تسجيل الدخول
    effect(() => {
      if (auth.isAuthenticated()) {
        constants.ensure(
          'NFD_ANN_SCOPE',
          'NFD_CMP_STAT',
          'NFD_USR_STAT',
          ...LIVE_LABEL_MAPS.map(([group]) => group)
        );
      }
    });
  }

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
    });
  }
}
