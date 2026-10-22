import {
  Brain,
  Clapperboard,
  Cpu,
  Music,
  Palette,
  Shirt,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Music,
  Sparkles,
  UtensilsCrossed,
  Palette,
  Clapperboard,
  Shirt,
  Cpu,
  Trophy,
  Brain,
};

export function DomainIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon className={className} aria-hidden />;
}
