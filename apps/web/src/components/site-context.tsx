'use client';

import { createContext, useContext, useMemo, useRef, useState } from 'react';

type NotificationType = 'success' | 'info';

type NotificationState = {
  message: string;
  type: NotificationType;
} | null;

type SiteContextValue = {
  cartCount: number;
  notification: NotificationState;
  addToCart: (productName: string) => void;
  notify: (message: string, type?: NotificationType) => void;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export const SiteProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartCount, setCartCount] = useState(0);
  const [notification, setNotification] = useState<NotificationState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string, type: NotificationType = 'success') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotification({ message, type });
    timeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const addToCart = (productName: string) => {
    setCartCount((prev) => prev + 1);
    notify(`${productName} adicionado ao carrinho!`);
  };

  const value = useMemo<SiteContextValue>(
    () => ({ cartCount, notification, addToCart, notify }),
    [cartCount, notification],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within SiteProvider');
  }
  return context;
};