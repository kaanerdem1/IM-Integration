import { DragEvent, ReactNode, useCallback, useRef, useState } from 'react';
import { IconFolderUp } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Box } from '@mantine/core';
import { useUppyUpload } from '@/components/upload/_hooks/useUppyUpload';
import classes from '@/components/upload/_ui/_style/style.module.scss';

interface CustomDropContainerProps {
  disableClick?: boolean;
  children?: ReactNode | ((ctx: { isDragging: boolean }) => ReactNode);
}

export function Dropzone({ disableClick = false, children }: CustomDropContainerProps) {
  const { t } = useTranslation();
  const tr = t as unknown as (key: string) => string;
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const { openFileDialog, itemsDrop } = useUppyUpload();

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current -= 1;

    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // zorunlu
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      void itemsDrop(e.nativeEvent);
    },
    [itemsDrop]
  );

  return (
    <Box
      className={clsx(classes.dropzoneContainer, {
        [classes.drag]: isDragging,
      })}
      style={{ position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => {
        if (disableClick) {
          return;
        }
        if (e.target !== e.currentTarget) {
          return;
        }
        openFileDialog();
      }}
    >
      {typeof children === 'function' ? children({ isDragging }) : children}
      {isDragging && (
        <Box className={classes.dropzone}>
          <Box className={classes.label}>
            <IconFolderUp size="60px" stroke={1} />
            {tr('label.dropTheFiles')}
          </Box>
        </Box>
      )}
    </Box>
  );
}
