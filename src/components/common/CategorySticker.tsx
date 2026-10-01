import { ArrowLeftRight, Tag } from "lucide-react";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { Sticker } from "@/components/common/Sticker";
import type { Category } from "@/types/domain";

interface CategoryStickerProps {
  category?: Pick<Category, "icon" | "color"> | null;
  isTransfer?: boolean;
  size?: "sm" | "md" | "lg";
  tilt?: number;
  className?: string;
}

/** A category's icon as a cartoon sticker; transfers get the sky-blue swap sticker. */
export function CategorySticker({ category, isTransfer, size = "md", tilt, className }: CategoryStickerProps) {
  if (isTransfer) {
    return (
      <Sticker color="#8fd3ff" size={size} tilt={tilt} className={className}>
        <ArrowLeftRight />
      </Sticker>
    );
  }
  return (
    <Sticker color={category?.color || "#e4d6bc"} size={size} tilt={tilt} className={className}>
      {category?.icon ? <DynamicIcon name={category.icon} /> : <Tag />}
    </Sticker>
  );
}
