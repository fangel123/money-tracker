import { cn } from "@/lib/utils";

interface HeroCardProps {
  /** Background fill — one of the cartoon palette colors. */
  color: string;
  label: React.ReactNode;
  value: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** Big colored summary card (total budget, total balance, ...). Text is always ink for contrast. */
export function HeroCard({ color, label, value, children, className }: HeroCardProps) {
  return (
    <section
      className={cn("relative overflow-hidden rounded-cartoon border-3 border-line p-5 text-ink shadow-cartoon-lg lg:p-6", className)}
      style={{ background: color }}
    >
      <div className="text-xs font-black uppercase tracking-[0.1em]">{label}</div>
      <div className="mt-2 font-display text-[40px] font-bold leading-none lg:text-[46px]">{value}</div>
      {children}
    </section>
  );
}

/** Thick outlined progress bar used across budgets, goals and debts. */
export function CartoonBar({ percent, color, className }: { percent: number; color: string; className?: string }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("h-[18px] w-full overflow-hidden rounded-full border-2.5 border-line bg-background", className)}>
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${width}%`, background: color, borderRight: width > 0 && width < 100 ? "2.5px solid #1e1b18" : undefined }}
      />
    </div>
  );
}
