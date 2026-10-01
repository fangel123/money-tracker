import { cn } from "@/lib/utils";

interface MascotProps {
  size?: number;
  mood?: "happy" | "worried";
  className?: string;
}

/** Koin, the app's coin mascot. Decorative only. */
export function Mascot({ size = 84, mood = "happy", className }: MascotProps) {
  const mouth = mood === "happy" ? "M34 53 Q42 61 50 53" : "M36 56 Q42 51 48 56";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 84"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="42" cy="44" r="32" fill="#ffd447" stroke="#1e1b18" strokeWidth="3.5" />
      <circle cx="42" cy="44" r="24" fill="none" stroke="#e8a900" strokeWidth="3" strokeDasharray="4 5" />
      <circle cx="32" cy="38" r="4.5" fill="#1e1b18" />
      <circle cx="52" cy="38" r="4.5" fill="#1e1b18" />
      <circle cx="33.5" cy="36.5" r="1.4" fill="#ffffff" />
      <circle cx="53.5" cy="36.5" r="1.4" fill="#ffffff" />
      <ellipse cx="25" cy="48" rx="4.5" ry="3" fill="#ff9ebb" />
      <ellipse cx="59" cy="48" rx="4.5" ry="3" fill="#ff9ebb" />
      <path d={mouth} stroke="#1e1b18" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
