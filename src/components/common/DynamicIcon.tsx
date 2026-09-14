import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DynamicIcon({ name, className, style }: DynamicIconProps) {
  if (!name) return null;

  // Convert kebab-case (e.g., "trending-up") to PascalCase (e.g., "TrendingUp")
  let pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const IconComponent = (LucideIcons as any)[pascalName];

  if (!IconComponent) {
    // If not found, log warning and return text
    console.warn(`Icon ${name} (${pascalName}) not found in lucide-react`);
    return <span className={className} style={style}>{name}</span>;
  }

  return <IconComponent className={className} style={style} />;
}
