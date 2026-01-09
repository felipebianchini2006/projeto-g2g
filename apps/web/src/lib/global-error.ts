export type GlobalErrorPayload = {
  message: string;
  status?: number;
  source?: string;
};

const GLOBAL_ERROR_EVENT = 'meoww:global-error';

export const emitGlobalError = (payload: GlobalErrorPayload) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(GLOBAL_ERROR_EVENT, { detail: payload }));
};

export const onGlobalError = (handler: (payload: GlobalErrorPayload) => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const listener = (event: Event) => {
    if (event instanceof CustomEvent) {
      handler(event.detail as GlobalErrorPayload);
    }
  };
  window.addEventListener(GLOBAL_ERROR_EVENT, listener);
  return () => window.removeEventListener(GLOBAL_ERROR_EVENT, listener);
};
