"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Mascot } from "@/components/common/Mascot";

interface EmptyStateProps {
  icon?: React.ReactNode;
  titleKey: string;
  descriptionKey?: string;
  actionKey?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ titleKey, descriptionKey, actionKey, onAction, className }: EmptyStateProps) {
  const t = useTranslations();

  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-10 text-center", className)}>
      <Mascot size={88} mood="worried" className="mb-3 -rotate-6" />
      <h3 className="font-display text-xl font-semibold text-foreground">{t(titleKey)}</h3>
      {descriptionKey && (
        <p className="mt-1 max-w-xs text-sm font-semibold text-muted-foreground">{t(descriptionKey)}</p>
      )}
      {actionKey && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border-3 border-line bg-primary px-5 font-display text-base font-semibold text-primary-foreground shadow-cartoon-sm transition-all hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t(actionKey)}
        </button>
      )}
    </div>
  );
}
