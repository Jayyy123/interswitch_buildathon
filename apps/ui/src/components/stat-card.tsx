import { type LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300">
        {Icon ? <Icon className="size-3.5 text-emerald-300" /> : null}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </article>
  );
}
