import { act, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { DropzoneProps } from '@mantine/dropzone';
import { DocumentUploadModal } from './DocumentUploadModal';
import {
  DOCUMENT_FILE_EXTENSIONS,
  getDocumentFileAccept,
  type DocumentFileExtension,
} from './fileRules';

const mocks = vi.hoisted(() => ({
  dropzone: vi.fn<(props: DropzoneProps) => void>(),
  upload: vi.fn(),
  save: vi.fn(),
  close: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/display/Modal/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@mantine/dropzone', () => ({
  Dropzone: (props: DropzoneProps) => {
    mocks.dropzone(props);
    return <div data-testid="document-upload-dropzone">{props.children}</div>;
  },
}));
vi.mock('./useDMS', () => ({
  useDMS: () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [attachmentId, setAttachmentId] = useState<string | null>(null);
    const clearFile = useCallback(() => {
      setSelectedFile(null);
      setAttachmentId(null);
    }, []);
    const handleFileChange = useCallback(async (file: File) => {
      mocks.upload(file);
      setSelectedFile(file);
      setAttachmentId('dms-1');
    }, []);
    return { selectedFile, attachmentId, clearFile, handleFileChange, isUploadingFile: false };
  },
}));

describe('DocumentUploadModal', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const file = new File(['document'], 'example.pdf', { type: 'application/pdf' });
  const render = (opened = true, acceptedExtensions?: readonly DocumentFileExtension[]) =>
    act(() => {
      root.render(
        <MantineProvider env="test">
          <DocumentUploadModal
            opened={opened}
            onClose={mocks.close}
            onSave={mocks.save}
            acceptedExtensions={acceptedExtensions}
          />
        </MantineProvider>
      );
    });
  const drop = async (files: File[]) => {
    await act(async () => {
      await mocks.dropzone.mock.lastCall![0].onDrop(
        files.map((file) => Object.assign(file, { path: file.name, relativePath: file.name }))
      );
    });
  };
  const submit = async () => {
    await act(async () => {
      container
        .querySelector<HTMLFormElement>('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue(true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('does not mount an upload session while closed', () => {
    render(false);
    expect(mocks.dropzone).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('uses a single-file native picker with the shared allowlist and size limit', () => {
    render();
    expect(mocks.dropzone.mock.lastCall![0]).toMatchObject({
      multiple: false,
      maxFiles: 1,
      maxSize: 25 * 1024 * 1024,
      useFsAccessApi: true,
      accept: expect.objectContaining({ 'application/vnd.ms-outlook': ['.msg'] }),
    });
  });
  it.each([
    { kind: 'spaced', name: `${'Long document name '.repeat(10)}.pdf` },
    { kind: 'unbroken', name: `${'LongDocumentName'.repeat(10)}.pdf` },
  ])('constrains and truncates both occurrences of a $kind file name', async ({ name }) => {
    render();
    await drop([new File(['document'], name, { type: 'application/pdf' })]);

    expect(container.querySelector('.mantine-ScrollArea-content')).toHaveStyle({
      width: '100%',
      minWidth: '100%',
      maxWidth: '100%',
    });
    const fileNames = container.querySelectorAll('[title]');
    expect(fileNames).toHaveLength(2);
    fileNames.forEach((fileName) => {
      expect(fileName).toHaveAttribute('data-truncate', 'end');
      expect(fileName).toHaveAttribute('title', name);
      expect(fileName.textContent).toBe(name);
    });

    const removeButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="document-upload-remove"]'
    )!;
    expect(removeButton).toBeEnabled();
    act(() => removeButton.click());
    expect(container.textContent).not.toContain(name);
    expect(container.querySelector('[data-testid="document-upload-remove"]')).toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects multiple files without uploading or retaining the previous attachment', async () => {
    render();
    await drop([file]);
    await drop([file, new File(['extra'], 'extra.pdf')]);
    expect(container.textContent).toContain('label.documentUpload.singleFileOnly');
    await submit();
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([
    { profile: 'wordPdf', name: 'analysis.PDF', type: 'application/pdf', allowed: true },
    {
      profile: 'wordPdf',
      name: 'analysis.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      allowed: false,
    },
    { profile: 'wordPdf', name: 'invalid.exe', type: 'application/pdf', allowed: false },
    { profile: 'wordExcelPdf', name: 'alpha-test.xlsx', type: '', allowed: true },
    { profile: 'wordExcelPdf', name: 'alpha-test.png', type: 'image/png', allowed: false },
    {
      profile: 'additional',
      name: 'technical.msg',
      type: 'application/octet-stream',
      allowed: true,
    },
    { profile: 'additional', name: 'technical.mp4', type: 'video/mp4', allowed: true },
    { profile: 'additional', name: 'technical.eml', type: 'message/rfc822', allowed: false },
  ] as const)(
    'applies the same $profile policy to accept and upload validation for $name',
    async ({ profile, name, type, allowed }) => {
      const extensions = DOCUMENT_FILE_EXTENSIONS[profile];
      render(true, extensions);
      expect(mocks.dropzone.mock.lastCall![0].accept).toEqual(getDocumentFileAccept(extensions));
      await drop([new File(['test'], name, { type })]);
      expect(mocks.upload).toHaveBeenCalledTimes(allowed ? 1 : 0);
      if (!allowed) {
        expect(container.textContent).toContain('label.documentUpload.invalidFileType');
      }
    }
  );
  it.each(['bad.exe', 'mail.eml'])('rejects %s before DMS upload', async (name) => {
    render();
    await drop([new File(['bad'], name)]);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('label.documentUpload.invalidFileType');
  });
  it('retains a successful DMS upload for retry if linking fails', async () => {
    mocks.save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render();
    await drop([file]);
    await submit();
    expect(mocks.close).not.toHaveBeenCalled();
    await submit();
    expect(mocks.upload).toHaveBeenCalledExactlyOnceWith(file);
    expect(mocks.save).toHaveBeenNthCalledWith(2, { attachmentId: 'dms-1', file });
    expect(mocks.close).toHaveBeenCalledOnce();
  });
  it('blocks closing and duplicate submit while linking is pending', async () => {
    let resolveSave: ((value: boolean) => void) | undefined;
    mocks.save.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSave = resolve;
      })
    );
    render();
    await drop([file]);
    await submit();
    expect(container.querySelector<HTMLButtonElement>('#document-upload-cancel')!.disabled).toBe(
      true
    );
    await submit();
    expect(mocks.save).toHaveBeenCalledOnce();
    await act(async () => {
      resolveSave?.(true);
    });
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
