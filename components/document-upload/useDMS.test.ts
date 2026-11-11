import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDMSFileName, isDmsUploadAbort, useDMS } from './useDMS';

const postApiDmsSave = vi.hoisted(() => vi.fn());

vi.mock('@/_api/_core/api-gen/dms', () => ({
  getDms: () => ({ postApiDmsSave }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('getDMSFileName', () => {
  it.each(['Analiz', 'Geliştirme', 'Test'])(
    'prefixes task documents with the task number and %s type without duplicating prefixes',
    (taskType) => {
      const expectedName = `G-123_${taskType}_DokumanAdi.docx`;
      expect(getDMSFileName('DokumanAdi.docx', 'G-123', taskType)).toBe(expectedName);
      expect(getDMSFileName('G-123_DokumanAdi.docx', 'G-123', taskType)).toBe(expectedName);
      expect(getDMSFileName(expectedName, 'G-123', taskType)).toBe(expectedName);
    }
  );

  it('prefixes the file with request number and document type', () => {
    expect(getDMSFileName('Belge.docx', 'YT-123', 'Tasarım Dökümanı')).toBe(
      'YT-123_Tasarım_Belge.docx'
    );
  });

  it('does not duplicate existing request or complete prefixes', () => {
    expect(getDMSFileName('YT-123-Belge.docx', 'YT-123', 'Kapsam Dokümanı')).toBe(
      'YT-123_Kapsam_Belge.docx'
    );
    expect(getDMSFileName('YT-123_Kapsam_Belge.docx', 'YT-123', 'Kapsam Dokümanı')).toBe(
      'YT-123_Kapsam_Belge.docx'
    );
  });

  it('replaces characters that are invalid in file name prefixes', () => {
    expect(getDMSFileName('Belge.docx', 'YT-123', 'Tebliğ/Yazısı Dokümanı')).toBe(
      'YT-123_Tebliğ-Yazısı_Belge.docx'
    );
  });
});

describe('isDmsUploadAbort', () => {
  it('recognizes browser and Axios cancellation errors as intentional aborts', () => {
    expect(isDmsUploadAbort(new DOMException('Upload canceled', 'AbortError'))).toBe(true);
    expect(isDmsUploadAbort({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isDmsUploadAbort(new Error('DMS is unavailable'))).toBe(false);
  });
});

describe('useDMS upload content type', () => {
  let root: ReturnType<typeof createRoot>;
  let dms: ReturnType<typeof useDMS>;

  const HookHarness = ({
    referenceNo,
    documentType = 'Ek Döküman',
  }: {
    referenceNo?: string;
    documentType?: string;
  }) => {
    dms = useDMS({ referenceNo, documentType });
    return null;
  };

  beforeEach(() => {
    postApiDmsSave.mockReset();
    postApiDmsSave.mockResolvedValue({ Data: { Id: 'attachment-1' } });
    root = createRoot(document.createElement('div'));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it.each(['Analiz', 'Geliştirme', 'Test'])(
    'uploads the actual task filename for %s',
    async (documentType) => {
      act(() => root.render(createElement(HookHarness, { referenceNo: 'G-123', documentType })));
      await act(async () => {
        await dms.handleFileChange(
          new File(['test'], 'DokumanAdi.pdf', { type: 'application/pdf' })
        );
      });
      expect(postApiDmsSave).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ FileName: `G-123_${documentType}_DokumanAdi.pdf` }),
        { signal: expect.any(AbortSignal) }
      );
      expect(dms.selectedFile?.name).toBe(`G-123_${documentType}_DokumanAdi.pdf`);
    }
  );

  it.each([
    {
      name: 'mail.msg',
      type: '',
      referenceNo: undefined,
      expectedName: 'mail.msg',
      expectedContentType: 'application/vnd.ms-outlook',
    },
    {
      name: 'mail.MSG',
      type: '',
      referenceNo: 'YT-123',
      expectedName: 'YT-123_Ek_mail.MSG',
      expectedContentType: 'application/vnd.ms-outlook',
    },
    {
      name: 'mail.msg',
      type: 'application/octet-stream',
      referenceNo: 'YT-123',
      expectedName: 'YT-123_Ek_mail.msg',
      expectedContentType: 'application/octet-stream',
    },
  ])(
    'sends $expectedContentType for $name with browser MIME "$type" and request $referenceNo',
    async ({ name, type, referenceNo, expectedName, expectedContentType }) => {
      act(() => root.render(createElement(HookHarness, { referenceNo })));
      const file = new File(['test mail'], name, { type });

      await act(async () => {
        await dms.handleFileChange(file);
      });

      expect(postApiDmsSave).toHaveBeenCalledTimes(1);
      expect(postApiDmsSave).toHaveBeenCalledWith(
        {
          Id: null,
          FileName: expectedName,
          ContentType: expectedContentType,
          FileContent: btoa('test mail'),
          Size: file.size,
          Tags: [],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(dms.selectedFile?.name).toBe(expectedName);
      expect(dms.attachmentId).toBe('attachment-1');
      expect(dms.isUploadingFile).toBe(false);
    }
  );
});
