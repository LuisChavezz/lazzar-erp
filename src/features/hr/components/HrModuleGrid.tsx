"use client";

import TiltCard from "@/src/components/TiltCard";
import { ClipboardListIcon, ClockIcon, LayersIcon, UserIcon } from "@/src/components/Icons";

const cardClassName =
  "cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full min-h-64";

// Índice del módulo: por ahora solo los catálogos base publicados. El acceso al
// módulo ya está protegido por R-RH en src/proxy.ts, así que las tarjetas no
// vuelven a filtrar por permiso.
const hrCards = [
  {
    icon: UserIcon,
    title: "Empleados",
    description: "Plantilla, adscripción y datos personales de cada empleado.",
    footerText: "Ver plantilla",
    href: "/hr/employees",
    accentClass: "text-emerald-600 dark:text-emerald-400",
    accentBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
    shadowColorClassName: "hover:shadow-emerald-500/25 dark:hover:shadow-emerald-500/25",
  },
  {
    icon: LayersIcon,
    title: "Áreas",
    description: "Áreas operativas de cada departamento y su clave corta.",
    footerText: "Ver áreas",
    href: "/hr/areas",
    accentClass: "text-sky-600 dark:text-sky-400",
    accentBgClass: "bg-sky-50 dark:bg-sky-500/10",
    shadowColorClassName: "hover:shadow-sky-500/25 dark:hover:shadow-sky-500/25",
  },
  {
    icon: ClipboardListIcon,
    title: "Puestos",
    description: "Catálogo de puestos, su área asignada y salario base.",
    footerText: "Ver puestos",
    href: "/hr/positions",
    accentClass: "text-violet-600 dark:text-violet-400",
    accentBgClass: "bg-violet-50 dark:bg-violet-500/10",
    shadowColorClassName: "hover:shadow-violet-500/25 dark:hover:shadow-violet-500/25",
  },
  {
    icon: ClockIcon,
    title: "Turnos",
    description: "Horarios de entrada y salida, días laborales y tolerancia.",
    footerText: "Ver turnos",
    href: "/hr/shifts",
    accentClass: "text-amber-600 dark:text-amber-400",
    accentBgClass: "bg-amber-50 dark:bg-amber-500/10",
    shadowColorClassName: "hover:shadow-amber-500/25 dark:hover:shadow-amber-500/25",
  },
];

/**
 * Grilla de accesos del módulo de Capital Humano.
 *
 * Es un componente de cliente porque las tarjetas reciben el icono como
 * componente: una función no cruza el límite RSC (Server → Client).
 */
export function HrModuleGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
      {hrCards.map((card) => (
        <TiltCard
          key={card.href}
          icon={card.icon}
          title={card.title}
          description={card.description}
          footerText={card.footerText}
          href={card.href}
          accentClass={card.accentClass}
          accentBgClass={card.accentBgClass}
          shadowColorClassName={card.shadowColorClassName}
          className={cardClassName}
        />
      ))}
    </div>
  );
}
