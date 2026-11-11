import { useEffect, type ComponentProps } from 'react';
import { useCallbackRef } from '@mantine/hooks';
import type { InformationNextstep } from '@/_api/_core/api-gen/types';
import { useModal } from '@/components/modal-host/_hook/useModal';
import type { WorkflowEntityReference } from './WorkflowEntityIdentity';
import { WorkflowWorkStartButton } from './WorkflowWorkStartButton';

type Props = Omit<ComponentProps<typeof WorkflowWorkStartButton>, 'onClick' | 'targetStartDate'> & {
  entity: WorkflowEntityReference;
  nextStep?: InformationNextstep;
  onStart: () => void;
};

export const WorkflowWorkStartAction = ({ entity, nextStep, onStart, ...buttonProps }: Props) => {
  const { openModal, closeModal, getModalOption } = useModal();
  const targetStartDate = nextStep?.Sla?.TargetStartDate;
  const onConfirm = useCallbackRef(() => {
    if (!buttonProps.disabled) {
      onStart();
    }
  });

  // A confirmation belongs to this record and plan, never to a later workflow step.
  useEffect(
    () => () => {
      if (getModalOption('WorkflowWorkStartConfirm')?.onConfirm === onConfirm) {
        closeModal('WorkflowWorkStartConfirm');
      }
    },
    [
      buttonProps.disabled,
      closeModal,
      entity.kind,
      entity.number,
      getModalOption,
      nextStep?.Id,
      nextStep?.Sla?.Id,
      onConfirm,
      targetStartDate,
    ]
  );

  return (
    <WorkflowWorkStartButton
      {...buttonProps}
      targetStartDate={targetStartDate}
      onClick={() => {
        if (!buttonProps.disabled) {
          openModal('WorkflowWorkStartConfirm', {
            entity,
            targetStartDate,
            onConfirm,
          });
        }
      }}
    />
  );
};
