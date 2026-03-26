import { cn } from '@/lib/utils';

export type StatusTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

const toneMap: Record<StatusTone, string> = {
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  yellow: 'bg-amber-500/15 text-amber-300 ring-amber-500/40',
  red: 'bg-rose-500/15 text-rose-300 ring-rose-500/40',
  blue: 'bg-sky-500/15 text-sky-300 ring-sky-500/40',
  gray: 'bg-slate-500/15 text-slate-300 ring-slate-500/40',
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export const StatusBadge = ({ label, tone = 'gray' }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
        toneMap[tone],
      )}
    >
      {label}
    </span>
  );
};
