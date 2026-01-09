'use client';

import { useEffect } from 'react';

import { onGlobalError } from '../../lib/global-error';
import { useSite } from '../site-context';

export const GlobalErrorListener = () => {
  const { notify } = useSite();

  useEffect(() => {
    const unsub = onGlobalError((payload) => {
      const message = payload?.message?.trim()
        ? payload.message
        : 'Algo deu errado. Tente novamente.';
      notify(message, 'error');
    });
    return unsub;
  }, [notify]);

  return null;
};
