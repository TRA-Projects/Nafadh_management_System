import { Pipe, PipeTransform } from '@angular/core';

import { resolvePublicUrl } from '../public-url';

/** Template helper: `'/images/foo.png' | assetUrl` */
@Pipe({ name: 'assetUrl', standalone: true })
export class AssetUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    if (path == null || path === '') {
      return '';
    }
    return resolvePublicUrl(path);
  }
}
