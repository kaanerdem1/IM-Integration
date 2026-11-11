import type {
  WorkflowCardModel,
  WorkflowPendingApproversCardModel,
  WorkflowPersonCardModel,
  WorkflowStatusCardModel,
} from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { PendingApproversCard } from './PendingApproversCardComponent';
import { PersonSummary } from './PersonSummaryComponent';
import { StatusSummary } from './StatusSummaryComponent';

type CardContentProps = {
  card: WorkflowCardModel;
  onDropdownOpenChange?: (opened: boolean) => void;
  pendingApproversTitle?: string;
};

const isPendingApproversCard = (
  card: WorkflowCardModel
): card is WorkflowPendingApproversCardModel => card.kind === 'pending-approvers';

const isPersonCard = (card: WorkflowCardModel): card is WorkflowPersonCardModel =>
  card.kind === 'person';

const isStatusCard = (card: WorkflowCardModel): card is WorkflowStatusCardModel =>
  card.kind === 'status';

export const CardContent = ({
  card,
  onDropdownOpenChange,
  pendingApproversTitle,
}: CardContentProps) => {
  if (isPendingApproversCard(card)) {
    return (
      <PendingApproversCard
        card={card}
        onDropdownOpenChange={onDropdownOpenChange}
        title={pendingApproversTitle}
      />
    );
  }

  if (isPersonCard(card)) {
    return <PersonSummary title={card.title} subtitle={card.subtitle} userCode={card.userCode} />;
  }

  if (isStatusCard(card)) {
    return <StatusSummary title={card.title} subtitle={card.subtitle} color={card.color} />;
  }

  return null;
};
