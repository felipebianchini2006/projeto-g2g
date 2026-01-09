'use client';

import { createContext, useContext, useMemo, useRef, useState } from 'react';

type NotificationType = 'success' | 'info' | 'error';

type NotificationState = {
  message: string;
  type: NotificationType;
} | null;

export type CartItem = {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
  image?: string | null;
  quantity: number;
};

export type CartItemInput = Omit<CartItem, 'quantity'> & { quantity?: number };

export type FavoriteItem = {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
  image?: string | null;
};

type SiteContextValue = {
  cartCount: number;
  cartItems: CartItem[];
  favorites: FavoriteItem[];
  isFavorite: (itemId: string) => boolean;
  notification: NotificationState;
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (itemId: string) => void;
  toggleFavorite: (item: FavoriteItem) => void;
  notify: (message: string, type?: NotificationType) => void;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export const SiteProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
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

  const addToCart = (item: CartItemInput) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((current) => current.id === item.id);
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            ...item,
            quantity: item.quantity ?? 1,
          },
        ];
      }
      const updated = [...prev];
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + (item.quantity ?? 1),
      };
      return updated;
    });
    notify(`${item.title} adicionado ao carrinho!`);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const toggleFavorite = (item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((current) => current.id === item.id);
      if (exists) {
        return prev.filter((current) => current.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const isFavorite = (itemId: string) =>
    favorites.some((item) => item.id === itemId);

  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems],
  );

  const value = useMemo<SiteContextValue>(
    () => ({
      cartCount,
      cartItems,
      favorites,
      isFavorite,
      notification,
      addToCart,
      removeFromCart,
      toggleFavorite,
      notify,
    }),
    [cartCount, cartItems, favorites, notification],
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
