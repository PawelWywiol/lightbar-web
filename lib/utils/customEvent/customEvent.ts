import type { CustomEventCallback, CustomEventDispatch } from './customEvent.types';

const isDocumentAvailable = (): boolean => typeof document !== 'undefined';

export const subscribeCustomEvent = <T extends CustomEventDispatch>(
  customEvent: CustomEventCallback<T>,
): void => {
  if (!isDocumentAvailable()) return;

  document.addEventListener(customEvent.name, customEvent.callback as EventListener);
};

export const unsubscribeCustomEvent = <T extends CustomEventDispatch>(
  customEvent: CustomEventCallback<T>,
): void => {
  if (!isDocumentAvailable()) return;

  document.removeEventListener(customEvent.name, customEvent.callback as EventListener);
};

export const dispatchCustomEvent = <T extends CustomEventDispatch>(customEvent: T): void => {
  if (!isDocumentAvailable()) return;

  document.dispatchEvent(
    new CustomEvent(customEvent.name, {
      detail: customEvent.detail as CustomEventInit<typeof customEvent.detail>,
    }),
  );
};
