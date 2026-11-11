import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fileToBase64, postBase64Attachment } from './_postBase64Attachment';

const apiClient = vi.hoisted(() => vi.fn());
vi.mock('@/_api-client/client', () => ({ apiClient }));

describe('fileToBase64', () => {
  it('stops reading when the upload is canceled before encoding starts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fileToBase64(
        new File(['content'], 'document.pdf', { type: 'application/pdf' }),
        controller.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('postBase64Attachment', () => {
  const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
  const uppyFile = {
    data: file,
    meta: {},
    name: file.name,
    size: file.size,
    type: file.type,
  } as Parameters<typeof postBase64Attachment>[0];

  beforeEach(() => apiClient.mockReset());

  it.each([
    { StatusCode: 200, Data: null, Error: null },
    { StatusCode: 200, Data: { Id: 'attachment-1' }, Error: { Message: 'Save failed' } },
  ])('rejects a DMS response without a successful attachment', async (response) => {
    apiClient.mockResolvedValue(response);

    await expect(postBase64Attachment(uppyFile)).rejects.toThrow();
  });
});
