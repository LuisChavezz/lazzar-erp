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
      shadowColorClassName={accentShadowClass}
      className="group cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-6 sm:p-8 h-full"
    >
      <div className="flex flex-col h-full">
        <div className={`mb-6 w-14 h-14 rounded-full ${accentBgClass} flex items-center justify-center ${accentClass}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description || "Gestionar información de órdenes"}
          </p>
        </div>
        <div className="mt-auto pt-8 flex items-center text-sky-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <span>Ver órdenes</span>
          <span className="w-4 h-4 ml-1 inline-flex items-center justify-center transition-transform group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </TiltCard>
  );
}
