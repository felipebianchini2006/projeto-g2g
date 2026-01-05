'use client';

import { useSite } from '../site-context';

export const SiteNotification = () => {
  const { notification } = useSite();

  if (!notification) {
    return null;
  }

  return (
    <div
      className={`notification notification--${notification.type}`}
      role="status"
      aria-live="polite"
    >
      <i
        className={`fas ${
          notification.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'
        }`}
        aria-hidden="true"
      />
      <span>{notification.message}</span>
    </div>
  );
};
