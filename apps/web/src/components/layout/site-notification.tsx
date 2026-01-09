'use client';

import { useSite } from '../site-context';

export const SiteNotification = () => {
  const { notification } = useSite();

  if (!notification) {
    return null;
  }

  const icon =
    notification.type === 'success'
      ? 'fa-check-circle'
      : notification.type === 'error'
        ? 'fa-exclamation-circle'
        : 'fa-info-circle';

  return (
    <div
      className={`notification notification--${notification.type}`}
      role={notification.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <i className={`fas ${icon}`} aria-hidden="true" />
      <span>{notification.message}</span>
    </div>
  );
};
