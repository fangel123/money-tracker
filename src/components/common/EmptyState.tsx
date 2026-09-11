"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
  icon?: React.ReactNode;
  titleKey: string;
  descriptionKey?: string;
  actionKey?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, titleKey, descriptionKey, actionKey, onAction, className }: EmptyStateProps) {
  const t = useTranslations();

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}
      <h3 className="text-lg font-medium text-foreground">{t(titleKey)}</h3>
      {descriptionKey && (
        <p className="mt-1 text-sm text-muted-foreground">{t(descriptionKey)}</p>
      )}
      {actionKey && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t(actionKey)}
        </button>
      )}
    </div>
  );
}