import { ModalOptionsMap } from '@/components/modal-host/definition';

export type ModalState = {
  [K in keyof ModalOptionsMap]: ModalOptionsMap[K] extends void
    ? { type: K }
    : ModalOptionsMap[K] extends void | infer O
      ? { type: K; options?: O }
      : { type: K; options: ModalOptionsMap[K] };
}[keyof ModalOptionsMap];

export type ModalType = keyof ModalOptionsMap;
