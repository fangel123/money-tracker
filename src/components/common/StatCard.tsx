import { cn } from "@/lib/utils";
import { Sticker } from "@/components/common/Sticker";

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Optional fill color; without it the card uses the surface color. */
  color?: string;
  note?: React.ReactNode;
  icon?: React.ReactNode;
  /** Value tone, e.g. "text-expense" for a negative number on a plain card. */
  valueClassName?: string;
  className?: string;
}

/** Small summary card (label, big number, note) used in the desktop stat rows. */
export function StatCard({ label, value, color, note, icon, valueClassName, className }: StatCardProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col justify-between gap-2 rounded-cartoon border-3 border-line px-5 py-4",
        color ? "text-ink shadow-cartoon-lg" : "bg-card shadow-cartoon",
        className
      )}
      style={color ? { background: color } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-[0.1em]">{label}</span>
        {icon && (
          <Sticker color={color ?? "#ffd447"} size="sm" tilt={4}>
            {icon}
          </Sticker>
        )}
      </div>
      <div className={cn("truncate font-display text-[30px] font-bold leading-none xl:text-[34px]", !color && valueClassName)}>{value}</div>
      {note && <p className={cn("text-[13px] font-extrabold", !color && "text-muted-foreground")}>{note}</p>}
    </section>
  );
}
