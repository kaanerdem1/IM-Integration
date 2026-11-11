import { ReactNode, useEffect, useRef, useState } from 'react';
import classes from './style.module.scss';
import Highlight from '@tiptap/extension-highlight';
import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import clsx from 'clsx';
import { Badge, Group, Input, ScrollArea } from '@mantine/core';
import type { MantineStyleProp, MantineTheme, ScrollAreaProps } from '@mantine/core';
import { RichTextEditor as MantineRichTextEditor } from '@mantine/tiptap';
import type {
  RichTextEditorProps as MantineRichTextEditorProps,
  RichTextEditorContentProps,
} from '@mantine/tiptap';
import { formFieldThemeTokens } from '@/_assets/style/t';
import { formLabelStyle } from '@/_common/_props/form-label';
import { getRichTextPlainTextLength } from '@/_helpers/rich-text';

export type RichTextEditorProps = Omit<MantineRichTextEditorProps, 'children' | 'editor'> & {
  contentProps?: RichTextEditorContentProps;
  contentScrollAreaProps?: ScrollAreaProps;
  defaultValue?: unknown;
  disabled?: boolean;
  editorKey?: string;
  error?: ReactNode;
  fieldProps?: {
    description?: ReactNode;
    maxLength?: number;
    minLength?: number;
  };
  label?: ReactNode;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  value?: unknown;
  withAsterisk?: boolean;
};

export type RichTextEditorInputProps = Omit<
  RichTextEditorProps,
  | 'defaultValue'
  | 'disabled'
  | 'editorKey'
  | 'error'
  | 'label'
  | 'onBlur'
  | 'onChange'
  | 'value'
  | 'withAsterisk'
>;

const richTextEditorExtensions = [StarterKit, Highlight];

const getRichTextEditorStyle = (
  style: MantineStyleProp | undefined,
  hasError: boolean,
  disabled: boolean
): MantineStyleProp => {
  if (!hasError && !disabled) {
    return style;
  }

  const stateStyles = [
    disabled
      ? {
          backgroundColor: formFieldThemeTokens.disabledBackgroundColor,
          borderColor: formFieldThemeTokens.disabledBorderColor,
          color: formFieldThemeTokens.disabledTextColor,
        }
      : undefined,
    hasError ? { borderColor: formFieldThemeTokens.errorBorderColor } : undefined,
  ].filter(Boolean) as MantineStyleProp[];

  if (!style) {
    return stateStyles;
  }

  if (Array.isArray(style)) {
    return [...style, ...stateStyles];
  }

  if (typeof style === 'function') {
    return (theme: MantineTheme) => ({
      ...style(theme),
      ...(disabled
        ? {
            backgroundColor: formFieldThemeTokens.disabledBackgroundColor,
            borderColor: formFieldThemeTokens.disabledBorderColor,
            color: formFieldThemeTokens.disabledTextColor,
          }
        : {}),
      ...(hasError ? { borderColor: formFieldThemeTokens.errorBorderColor } : {}),
    });
  }

  return [style, ...stateStyles];
};

const normalizeRichTextContent = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  return '';
};

const getRichTextValue = (editor: Editor) => {
  if (editor.isEmpty) {
    return '';
  }

  return editor.getHTML();
};

const getRichTextDocumentLength = (editor: Editor) => editor.state.doc.textContent.length;

export function RichTextEditor({
  className,
  contentProps,
  contentScrollAreaProps,
  defaultValue,
  disabled = false,
  editorKey,
  error,
  fieldProps,
  label,
  mt = label ? 4 : 0,
  onBlur,
  onChange,
  style,
  value,
  variant,
  withAsterisk,
  ...props
}: RichTextEditorProps) {
  const { description, maxLength, minLength } = fieldProps ?? {};
  const maxLengthRef = useRef(maxLength);
  const onBlurRef = useRef(onBlur);
  const onChangeRef = useRef(onChange);
  const editorContent = normalizeRichTextContent(value ?? defaultValue);
  const hasError = Boolean(error);
  const [characterCount, setCharacterCount] = useState(() =>
    getRichTextPlainTextLength(editorContent)
  );
  const shouldShowCharacterCounter = typeof maxLength === 'number';
  const isUnderMinimum = typeof minLength === 'number' && characterCount < minLength;
  const isOverMaximum = typeof maxLength === 'number' && characterCount > maxLength;
  const characterCounterColor = isUnderMinimum || isOverMaximum ? 'orange' : 'gray';
  const richTextEditorStyle = getRichTextEditorStyle(style, hasError, disabled);
  const contentStyle = disabled
    ? [
        {
          backgroundColor: formFieldThemeTokens.disabledBackgroundColor,
          color: formFieldThemeTokens.disabledTextColor,
        },
        contentProps?.style,
      ].filter(Boolean)
    : contentProps?.style;
  const contentClassName = clsx(classes.content, contentProps?.className);
  const contentScrollAreaStyle = disabled
    ? [
        { backgroundColor: formFieldThemeTokens.disabledBackgroundColor },
        contentScrollAreaProps?.style,
      ].filter(Boolean)
    : contentScrollAreaProps?.style;
  const toolbarControlProps = {
    disabled,
    style: disabled
      ? {
          backgroundColor: 'transparent',
          color: formFieldThemeTokens.disabledTextColor,
        }
      : undefined,
  };

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    maxLengthRef.current = maxLength;
  }, [maxLength]);

  const editor = useEditor(
    {
      shouldRerenderOnTransaction: true,
      extensions: richTextEditorExtensions,
      content: editorContent,
      editable: !disabled,
      editorProps: {
        attributes: {
          'aria-label': String(label ?? ''),
        },
        handleDOMEvents: {
          blur: () => {
            onBlurRef.current?.();
            return false;
          },
        },
        handlePaste: (view, event) => {
          const resolvedMaxLength = maxLengthRef.current;

          if (typeof resolvedMaxLength !== 'number') {
            return false;
          }

          const pastedText = event.clipboardData?.getData('text/plain') ?? '';

          if (!pastedText) {
            return false;
          }

          const { from, to } = view.state.selection;
          const currentLength = view.state.doc.textContent.length;
          const replacedLength = view.state.doc.textBetween(from, to).length;
          const remainingLength = resolvedMaxLength - (currentLength - replacedLength);

          if (pastedText.length <= remainingLength) {
            return false;
          }

          event.preventDefault();

          if (remainingLength > 0) {
            view.dispatch(view.state.tr.insertText(pastedText.slice(0, remainingLength), from, to));
          }

          return true;
        },
        handleTextInput: (view, from, to, text) => {
          const resolvedMaxLength = maxLengthRef.current;

          if (typeof resolvedMaxLength !== 'number') {
            return false;
          }

          const currentLength = view.state.doc.textContent.length;
          const replacedLength = view.state.doc.textBetween(from, to).length;
          const remainingLength = resolvedMaxLength - (currentLength - replacedLength);

          if (text.length <= remainingLength) {
            return false;
          }

          if (remainingLength > 0) {
            view.dispatch(view.state.tr.insertText(text.slice(0, remainingLength), from, to));
          }

          return true;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        setCharacterCount(getRichTextDocumentLength(currentEditor));
        onChangeRef.current?.(getRichTextValue(currentEditor));
      },
    },
    [editorKey]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (getRichTextValue(editor) !== editorContent) {
      editor.commands.setContent(editorContent, { emitUpdate: false });
    }

    setCharacterCount(getRichTextPlainTextLength(editorContent));
  }, [editor, editorContent]);

  return (
    <Input.Wrapper
      description={description}
      error={error}
      label={label}
      styles={{
        error: {
          marginTop: 'calc(var(--mantine-spacing-xs) / 2)',
        },
        label: formLabelStyle,
      }}
      withAsterisk={withAsterisk}
    >
      <MantineRichTextEditor
        {...props}
        aria-invalid={hasError || undefined}
        className={clsx(classes.root, className)}
        data-disabled={disabled || undefined}
        data-error={hasError || undefined}
        editor={editor}
        mt={mt}
        style={richTextEditorStyle}
        variant={variant}
      >
        <MantineRichTextEditor.Toolbar
          sticky
          stickyOffset="var(--docs-header-height)"
          style={{
            backgroundColor: disabled
              ? formFieldThemeTokens.disabledBackgroundColor
              : formFieldThemeTokens.backgroundColor,
          }}
        >
          <MantineRichTextEditor.ControlsGroup style={{ backgroundColor: 'transparent' }}>
            <MantineRichTextEditor.Bold {...toolbarControlProps} />
            <MantineRichTextEditor.Italic {...toolbarControlProps} />
            <MantineRichTextEditor.Underline {...toolbarControlProps} />
            <MantineRichTextEditor.Strikethrough {...toolbarControlProps} />
            <MantineRichTextEditor.ClearFormatting {...toolbarControlProps} />
            <MantineRichTextEditor.Highlight {...toolbarControlProps} />
            <MantineRichTextEditor.BulletList {...toolbarControlProps} />
            <MantineRichTextEditor.OrderedList {...toolbarControlProps} />
            <MantineRichTextEditor.CodeBlock {...toolbarControlProps} />
          </MantineRichTextEditor.ControlsGroup>
        </MantineRichTextEditor.Toolbar>

        <ScrollArea.Autosize
          mah={120}
          mih={96}
          {...contentScrollAreaProps}
          style={contentScrollAreaStyle}
        >
          <MantineRichTextEditor.Content
            {...contentProps}
            className={contentClassName}
            style={contentStyle}
          />
        </ScrollArea.Autosize>

        {shouldShowCharacterCounter ? (
          <Group justify="flex-end" px="sm" py={6}>
            <Badge
              color={characterCounterColor}
              fw={600}
              radius="sm"
              size="sm"
              tt="none"
              variant="light"
            >
              {characterCount}/{maxLength}
            </Badge>
          </Group>
        ) : null}
      </MantineRichTextEditor>
    </Input.Wrapper>
  );
}
