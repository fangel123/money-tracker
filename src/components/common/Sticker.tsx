import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-9 w-9 rounded-xl [&_svg]:h-4 [&_svg]:w-4",
  md: "h-11 w-11 rounded-[14px] [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-14 w-14 rounded-[18px] [&_svg]:h-6 [&_svg]:w-6",
} as const;

interface StickerProps {
  /** Any CSS color; it is softened to a pastel so the ink icon stays readable. */
  color?: string | null;
  size?: keyof typeof SIZES;
  /** Rotation in degrees, for the hand-placed sticker look. */
  tilt?: number;
  className?: string;
  children: React.ReactNode;
}

/** Icon tile with a thick ink outline — used for categories, menu items and accounts. */
export function Sticker({ color, size = "md", tilt = 0, className, children }: StickerProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border-2.5 border-ink text-ink [&_svg]:stroke-[2.5]",
        SIZES[size],
        className
      )}
      style={{
        background: color ? `color-mix(in srgb, ${color} 55%, #ffffff)` : "#ffffff",
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** Alternating tilt for lists, so neighbouring stickers lean different ways. */
export function stickerTilt(index: number) {
  return index % 2 === 0 ? -3 : 3;
}
