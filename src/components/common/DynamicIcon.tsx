import {
  Banknote,
  Briefcase,
  Building2,
  Car,
  Coffee,
  FileText,
  Flag,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  Music,
  PiggyBank,
  Plane,
  PlusCircle,
  Receipt,
  Shield,
  ShoppingBag,
  Smartphone,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Hanya ikon yang benar-benar dipakai kategori/akun/goal (nama kebab-case seperti di database).
 * Sebelumnya seluruh lucide-react (>1.000 ikon) ikut ter-bundle lewat `import *`.
 * Tambahkan di sini kalau ada ikon baru di pemilih ikon.
 */
const ICONS: Record<string, LucideIcon> = {
  bank: Landmark,
  banknote: Banknote,
  briefcase: Briefcase,
  "building-2": Building2,
  car: Car,
  cash: Banknote,
  coffee: Coffee,
  "file-text": FileText,
  flag: Flag,
  "gamepad-2": Gamepad2,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  laptop: Laptop,
  "more-horizontal": MoreHorizontal,
  music: Music,
  "piggy-bank": PiggyBank,
  plane: Plane,
  "plus-circle": PlusCircle,
  receipt: Receipt,
  shield: Shield,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  tag: Tag,
  "trending-up": TrendingUp,
  "utensils-crossed": UtensilsCrossed,
  wallet: Wallet,
};

interface DynamicIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DynamicIcon({ name, className, style }: DynamicIconProps) {
  if (!name) return null;
  const IconComponent = ICONS[name] ?? Tag;
  return <IconComponent className={className} style={style} />;
}
