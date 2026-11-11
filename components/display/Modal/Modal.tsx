import { FC, useEffect, useId, useMemo, useRef } from 'react';
import classes from './_style/style.module.scss';
import clsx from 'clsx';
import { LoadingOverlay, Modal as MantineModal, ModalProps } from '@mantine/core';
import { useHostedModalStackCleanup } from '@/components/modal-host/useHostedModalStackCleanup';
import { useHostedModalStackId } from '@/components/modal-host/useHostedModalStackId';

interface Props extends ModalProps {
  children?: React.ReactNode;
  loading?: boolean;
}

const loadingOverlayProps = { blur: 1, opacity: 0.5 } as const;

export const Modal: FC<Props> = ({ children, classNames, loading, ...props }: Props) => {
  const hostedModalStackId = useHostedModalStackId();
  const removeHostedModalFromStack = useHostedModalStackCleanup();
  const modalInstanceId = useId();
  const openedRef = useRef(props.opened);
  const wasOpenedRef = useRef(props.opened);
  // Every hosted instance needs a distinct id so closed children or siblings cannot hide it.
  const automaticStackId = hostedModalStackId
    ? `${hostedModalStackId}-${modalInstanceId}`
    : undefined;
  const resolvedStackId = props.stackId ?? automaticStackId;
  // Closed automatic modals stay out of the stack to avoid no-op removal updates.
  const activeStackId = props.stackId ?? (props.opened ? automaticStackId : undefined);
  const resolvedClassNames = useMemo<ModalProps['classNames']>(() => {
    if (typeof classNames === 'function') {
      return (theme, modalProps, context) => {
        const resolved = classNames(theme, modalProps, context);

        return {
          ...resolved,
          content: clsx(resolved.content, classes.stackModalContent),
        };
      };
    }

    return {
      ...classNames,
      content: clsx(classNames?.content, classes.stackModalContent),
    };
  }, [classNames]);

  openedRef.current = props.opened;

  useEffect(() => {
    if (wasOpenedRef.current && !props.opened && props.stackId === undefined && automaticStackId) {
      removeHostedModalFromStack?.(automaticStackId);
    }

    wasOpenedRef.current = props.opened;
  }, [automaticStackId, props.opened, props.stackId, removeHostedModalFromStack]);

  useEffect(
    () => () => {
      // Mantine unregisters on close but needs an explicit cleanup when an open modal unmounts.
      if (openedRef.current && resolvedStackId) {
        removeHostedModalFromStack?.(resolvedStackId);
      }
    },
    [removeHostedModalFromStack, resolvedStackId]
  );

  return (
    <MantineModal {...props} classNames={resolvedClassNames} stackId={activeStackId}>
      <>
        <LoadingOverlay visible={loading} overlayProps={loadingOverlayProps} />
        {children}
      </>
    </MantineModal>
  );
};
