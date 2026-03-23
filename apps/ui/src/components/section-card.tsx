import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  icon: Icon,
}: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            {Icon ? <Icon className="size-4 text-emerald-300" /> : null}
            {title}
          </h2>
          {description ? <p className="text-sm text-slate-300">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
