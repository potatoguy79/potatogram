import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  type: 'blue' | 'red' | 'gold' | string | null | undefined;
  className?: string;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ type, className }) => {
  if (!type) return null;

  const colorClass = {
    blue: 'text-primary',
    red: 'text-destructive',
    gold: 'text-yellow-500',
  }[type] || 'text-primary';

  return (
    <BadgeCheck className={cn('w-4 h-4 fill-current', colorClass, className)} />
  );
};

export default VerifiedBadge;