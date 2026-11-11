import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Text } from '@mantine/core';
import i18n from '@/_i18n/config';
import { Modal } from '@/components/display/Modal/Modal';
import { ModalBody } from '@/components/display/Modal/ModalBody';
import { ModalFooter } from '@/components/display/Modal/ModalFooter';
import { LoaderMini } from '@/components/display/Nodata/LoaderMini';

interface ModalLoadBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  resetKey: string;
}

interface ModalLoadBoundaryState {
  hasError: boolean;
}

export class ModalLoadBoundary extends Component<ModalLoadBoundaryProps, ModalLoadBoundaryState> {
  state: ModalLoadBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModalLoadBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Modal content could not be rendered.', error, errorInfo);
  }

  componentDidUpdate(previousProps: ModalLoadBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Modal opened title={i18n.t('label.root.modalLoadError.title')} onClose={this.props.onClose}>
        <ModalBody>
          <Text size="sm">{i18n.t('label.root.modalLoadError.description')}</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={this.props.onClose}>{i18n.t('label.close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export const ModalLoadingFallback = ({ onClose }: { onClose: () => void }) => (
  <Modal opened withCloseButton={false} onClose={onClose}>
    <ModalBody>
      <LoaderMini mih={80} type="oval" />
    </ModalBody>
  </Modal>
);
