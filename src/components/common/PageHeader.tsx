import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons on the right (e.g. "+ Tambah"). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Page title row. On desktop the title already sits in the top bar,
 * so only the description and actions are shown there.
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight lg:hidden">{title}</h1>
        {description && <p className="text-sm font-bold text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
