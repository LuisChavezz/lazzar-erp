import TiltCard from "@/src/components/TiltCard";

interface OrderMenuCardProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  onMouseEnter?: () => void;
  accentClass: string;
  accentBgClass: string;
  accentShadowClass: string;
}

export function OrderMenuCard({
  title,
  description,
  icon: Icon,
  onClick,
  onMouseEnter,
  accentClass,
  accentBgClass,
  accentShadowClass,
}: OrderMenuCardProps) {
  return (
    <TiltCard
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      icon={Icon}
      title={title}
      description={description || "Gestionar información de órdenes"}
      footerText="Ver órdenes"
      accentClass={accentClass}
      accentBgClass={accentBgClass}
      shadowColorClassName={accentShadowClass}
      className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-6 sm:p-8 h-full"
    />
  );
}
