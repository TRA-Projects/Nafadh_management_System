import { mergeArTranslations } from './merge-ar-translations';

describe('mergeArTranslations', () => {
  const merged = mergeArTranslations();

  it('SharedPagerLabels_ResolveFromCommon', () => {
    expect(merged['jobseeker.jobsList.perPage']).toBeTruthy();
    expect(merged['jobseeker.common.prev']).toBeTruthy();
  });

  it('SystemAdminNav_HasArabicLabels', () => {
    expect(merged['jobseeker.layout.nav.admin.systemConfiguration']).toBeTruthy();
    expect(merged['jobseeker.layout.nav.admin.customNotifications']).toBeTruthy();
  });

  it('CustomNotifications_AreMerged', () => {
    expect(merged['jobseeker.customNotifications.title']).toBeTruthy();
  });
});
