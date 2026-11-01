import { translateApplicationUploadError } from './application-upload-error.i18n';

describe('application upload error messages', () => {
  it('maps file_too_large to the size limit message', () => {
    const msg = translateApplicationUploadError({
      status: 400,
      code: 'file_too_large',
      message: 'The file exceeds the maximum allowed size.',
    });
    expect(msg).toContain('maximum allowed size');
  });

  it('maps an oversized request body to the size limit message', () => {
    const msg = translateApplicationUploadError({
      status: 413,
      message: 'Request body too large.',
    });
    expect(msg).toContain('maximum allowed size');
  });

  it('leaves unrelated application errors unchanged', () => {
    expect(
      translateApplicationUploadError({
        status: 400,
        message: 'JobId is required.',
      })
    ).toBeNull();
  });
});
