import * as React from 'react';

import { cn } from '../../lib/utils';

export const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-2xl bg-meow-100/70', className)}
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';
