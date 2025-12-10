import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VerifiedBadgeProps {
  type: 'blue' | 'red' | 'gold' | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ type, className, size = 'md' }) => {
  if (!type) return null;

  const colorClass = {
    blue: 'text-primary',
    red: 'text-destructive',
    gold: 'text-yellow-500',
  }[type] || 'text-primary';

  const sizeClass = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <BadgeCheck className={cn('fill-current', sizeClass, colorClass, className)} />
  );
};

export default VerifiedBadge;