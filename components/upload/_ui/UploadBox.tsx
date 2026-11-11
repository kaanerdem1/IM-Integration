import { FC } from 'react';
import classes from './_style/style.module.scss';
import clsx from 'clsx';
import { Box, Collapse, ScrollArea } from '@mantine/core';
import { LoaderMini } from '@/components/display/Nodata/LoaderMini';
import { useModal } from '@/components/modal-host/_hook/useModal';
import { useUploads } from '@/components/upload/_hooks/useUploads';
import { UploadBoxHeader } from '@/components/upload/_ui/UploadBoxHeader';
import { UploadItem } from './UploadItem';

export const UploadBox: FC = () => {
  const { openModal } = useModal();
  const {
    files,
    aggregates,
    hasActive,
    engine,
    collapse: { opened, toggle },
  } = useUploads();

  // Don't render if provider is not available (e.g., during logout)
  if (!engine || !aggregates.showBox) {
    return null;
  }

  return (
    <>
      {/*{process.env.NODE_ENV === 'development' && <FPSMonitor />}*/}

      <Box
        className={clsx(classes.uploadBox, {
          [classes.visible]: aggregates.showBox,
          [classes.opened]: opened,
        })}
      >
        <UploadBoxHeader
          aggregates={aggregates}
          opened={opened}
          onToggle={toggle}
          onClose={() => {
            hasActive ? openModal('UploadCancel') : engine.restart();
          }}
        />
        <Collapse expanded={opened}>
          <ScrollArea.Autosize mah={400} w="100%">
            {files.length === 0 ? (
              <LoaderMini />
            ) : (
              <Box>
                {files.map((item) => (
                  <UploadItem key={item.id} item={item} />
                ))}
              </Box>
            )}
          </ScrollArea.Autosize>
        </Collapse>
      </Box>
    </>
  );
};
