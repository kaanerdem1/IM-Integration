import { act, useEffect } from 'react';
import { DynamicFieldRenderer } from '.';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { ComponentType } from '@/_api/_core/api-gen/types';
import { theme } from '@/_assets/style/theme';
import { FieldPermissionContext } from '@/_auth/role-management/field/FieldPermissionContext';
import { DynamicField, FieldComponentType, FieldDataType } from './type';

vi.mock('@/_api/hooks', () => ({
  useHolidayAll: () => ({ data: undefined }),
}));

type FormValues = {
  summary: string;
  unit?: string;
};

const textareaField: DynamicField = {
  ComponentType: FieldComponentType.TextArea,
  DataType: FieldDataType.String,
  Label: 'Talep Özeti',
  Value: 'summary',
};

const richTextField: DynamicField = {
  ...textareaField,
  ComponentType: FieldComponentType.TextEditor,
};

const selectField: DynamicField = {
  ComponentType: FieldComponentType.Select,
  DataType: FieldDataType.String,
  Label: 'Proje Lideri İş Birimi',
  Value: 'unit',
};

const textareaFieldWithHelperText: DynamicField = {
  ...textareaField,
  HelperText: 'Talep özetini kısa ve anlaşılır yazınız',
};

function TextareaField() {
  const form = useForm<FormValues>({
    initialValues: {
      summary: 'Kısa özet',
    },
  });

  return (
    <MantineProvider theme={theme}>
      <DynamicFieldRenderer field={textareaField} form={form} />
    </MantineProvider>
  );
}

function TextareaFieldWithHelperText() {
  const form = useForm<FormValues>({
    initialValues: {
      summary: 'Kısa özet',
    },
  });

  return (
    <MantineProvider theme={theme}>
      <DynamicFieldRenderer field={textareaFieldWithHelperText} form={form} />
    </MantineProvider>
  );
}

function RichTextFieldWithError() {
  const form = useForm<FormValues>({
    initialValues: {
      summary: '<p>Kısa özet</p>',
    },
  });
  const { setFieldError } = form;

  useEffect(() => {
    setFieldError('summary', 'Talep Özeti en az 50 karakter içermelidir');
  }, [setFieldError]);

  return (
    <MantineProvider theme={theme}>
      <DynamicFieldRenderer
        field={richTextField}
        form={form}
        richTextEditorProps={{
          fieldProps: {
            maxLength: 500,
            minLength: 50,
          },
        }}
      />
    </MantineProvider>
  );
}

function RemoteSelectField({
  options,
  onSearch = () => undefined,
}: {
  options: Array<{ label: string; value: string }>;
  onSearch?: (value: string) => void;
}) {
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      summary: '',
      unit: 'selected',
    },
  });

  return (
    <MantineProvider theme={theme}>
      <DynamicFieldRenderer
        field={selectField}
        form={form}
        options={options}
        selectProps={{ onSearch }}
      />
    </MantineProvider>
  );
}

function ComponentTypeField({ componentType }: { componentType: DynamicField['ComponentType'] }) {
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: { summary: 'Kısa özet' },
  });
  return (
    <MantineProvider theme={theme}>
      <DynamicFieldRenderer
        field={{ ...textareaField, ComponentType: componentType }}
        form={form}
      />
    </MantineProvider>
  );
}

function RequiredField({
  field,
  requiredSource,
  required = true,
  disabled = false,
}: {
  field: DynamicField;
  requiredSource: 'permission' | 'prop';
  required?: boolean;
  disabled?: boolean;
}) {
  const form = useForm<Record<string, unknown>>({
    mode: 'uncontrolled',
    initialValues: { field: undefined },
  });

  return (
    <MantineProvider theme={theme}>
      <FieldPermissionContext.Provider
        value={{ inputCode: 'field', required: requiredSource === 'permission' && required }}
      >
        <DynamicFieldRenderer
          field={{ ...field, Value: 'field', Label: 'Test field' }}
          form={form}
          disabled={disabled}
          required={requiredSource === 'prop' && required}
          options={[{ value: 'option', label: 'Option' }]}
        />
      </FieldPermissionContext.Provider>
    </MantineProvider>
  );
}

describe('DynamicFieldRenderer', () => {
  describe.each(['permission', 'prop'] as const)('required from %s', (requiredSource) => {
    it.each<DynamicField>([
      { ComponentType: 'Text', DataType: 'String' },
      { ComponentType: 'Text', DataType: 'Number' },
      { ComponentType: 'Text', DataType: 'Date' },
      { ComponentType: 'Text', DataType: 'DateRange' },
      { ComponentType: 'TextArea' },
      { ComponentType: 'TextEditor' },
      { ComponentType: 'Select' },
      { ComponentType: 'MultiSelect' },
      { ComponentType: 'FileUpload' },
      { ComponentType: 'MultiFileUpload' },
      { ComponentType: 'Radio' },
    ])('shows the asterisk only for editable required fields: %j', async (field) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      const render = (disabled: boolean, required = true) =>
        act(async () =>
          root.render(
            <RequiredField
              field={field}
              requiredSource={requiredSource}
              disabled={disabled}
              required={required}
            />
          )
        );

      try {
        await render(false);
        expect(container.querySelector('.mantine-InputWrapper-required')).not.toBeNull();
        await render(true);
        expect(container.querySelector('.mantine-InputWrapper-required')).toBeNull();
        await render(false);
        expect(container.querySelector('.mantine-InputWrapper-required')).not.toBeNull();
        await render(false, false);
        expect(container.querySelector('.mantine-InputWrapper-required')).toBeNull();
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    });
  });

  it.each([
    ComponentType.Button,
    ComponentType.Table,
    FieldComponentType.Button,
    FieldComponentType.Table,
  ])('does not render a form input for non-input component type %s', async (componentType) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => root.render(<ComponentTypeField componentType={componentType} />));
      expect(container.querySelector('input, textarea, button, table')).toBeNull();
      expect(container.querySelector('label')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it.each([ComponentType.Text, FieldComponentType.Text, undefined])(
    'preserves the text input for component type %s',
    async (componentType) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      try {
        await act(async () => root.render(<ComponentTypeField componentType={componentType} />));
        expect(container.querySelector('input')?.value).toBe('Kısa özet');
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    }
  );

  it('renders textarea field with Mantine Textarea', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<TextareaField />);
      });

      expect(container.querySelector('textarea')).not.toBeNull();
      expect(container.querySelector('.mantine-RichTextEditor-root')).toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('renders helper text info icon next to field label when HelperText exists', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<TextareaFieldWithHelperText />);
      });

      expect(container.querySelector('label')?.textContent).toContain('Talep Özeti');
      expect(
        container.querySelector('[aria-label="Talep özetini kısa ve anlaşılır yazınız"]')
      ).not.toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('marks rich text editor as invalid when text editor field has an error', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<RichTextFieldWithError />);
      });

      const editorRoot = container.querySelector('.mantine-RichTextEditor-root');

      if (!editorRoot) {
        throw new Error(container.innerHTML);
      }

      expect(editorRoot.getAttribute('aria-invalid')).toBe('true');
      expect(editorRoot.getAttribute('style')).toContain(
        'border-color: var(--mantine-color-error)'
      );
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('preserves remote select search while options change', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <RemoteSelectField
            options={[
              { label: 'Seçili Birim', value: 'selected' },
              { label: 'Diğer Birim', value: 'other' },
            ]}
          />
        );
      });

      const input = container.querySelector('input');

      if (!input) {
        throw new Error(container.innerHTML);
      }

      expect(input.value).toBe('Seçili Birim');

      await act(async () => {
        input.focus();

        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;

        if (!valueSetter) {
          throw new Error('HTMLInputElement value setter is unavailable');
        }

        valueSetter.call(input, 'Aranan Birim');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await act(async () => {
        root.render(
          <RemoteSelectField options={[{ label: 'Aranan Birim Sonucu', value: 'result' }]} />
        );
      });

      expect(input.value).toBe('Aranan Birim');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('resolves the initial selection label when remote options arrive later', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<RemoteSelectField options={[]} />);
      });
      expect(container.querySelector('input')?.value).toBe('');

      await act(async () => {
        root.render(<RemoteSelectField options={[{ label: 'Seçili Birim', value: 'selected' }]} />);
      });
      expect(container.querySelector('input')?.value).toBe('Seçili Birim');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('searches only typed text and clears remote search on selection and blur', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSearch = vi.fn();
    vi.useFakeTimers();
    try {
      await act(async () =>
        root.render(
          <RemoteSelectField
            onSearch={onSearch}
            options={[
              { label: 'Seçili Birim', value: 'selected' },
              { label: 'Diğer Birim', value: 'other' },
            ]}
          />
        )
      );
      const input = container.querySelector('input');
      if (!input) {
        throw new Error('Missing select input');
      }
      await act(async () => input.focus());
      await act(async () => input.blur());
      expect(onSearch).not.toHaveBeenCalled();
      await act(async () => input.focus());
      expect(document.querySelectorAll('[role="option"]')).toHaveLength(2);

      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, 'Diğ');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(onSearch).not.toHaveBeenCalled();
      await act(async () => vi.advanceTimersByTime(300));
      expect(onSearch).toHaveBeenLastCalledWith('Diğ');
      const option = document.querySelector<HTMLElement>('[role="option"]');
      expect(option?.textContent).toBe('Diğer Birim');
      await act(async () => option?.click());
      expect(input.value).toBe('Diğer Birim');
      expect(onSearch).toHaveBeenLastCalledWith('');
      expect(onSearch).not.toHaveBeenCalledWith('Diğer Birim');
    } finally {
      await act(async () => root.unmount());
      vi.useRealTimers();
      container.remove();
    }
  });
});
