"use client";

import TiltCard from "@/src/components/TiltCard";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  ClockIcon,
  ContractIcon,
  LayersIcon,
  TrainingIcon,
  IncidentIcon,
  UserIcon,
} from "@/src/components/Icons";

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
  {
    icon: CalendarDaysIcon,
    title: "Calendarios",
    description: "Días laborables, descansos y festivos de cada turno.",
    footerText: "Ver calendarios",
    href: "/hr/calendars",
    accentClass: "text-rose-600 dark:text-rose-400",
    accentBgClass: "bg-rose-50 dark:bg-rose-500/10",
    shadowColorClassName: "hover:shadow-rose-500/25 dark:hover:shadow-rose-500/25",
  },
  {
    icon: ContractIcon,
    title: "Contratos",
    description: "Contratos laborales de cada empleado: tipo, vigencia y salario.",
    footerText: "Ver contratos",
    href: "/hr/contracts",
    accentClass: "text-indigo-600 dark:text-indigo-400",
    accentBgClass: "bg-indigo-50 dark:bg-indigo-500/10",
    shadowColorClassName: "hover:shadow-indigo-500/25 dark:hover:shadow-indigo-500/25",
  },
  {
    icon: TrainingIcon,
    title: "Capacitaciones",
    description: "Cursos de cada empleado: institución, estado, horas y calificación.",
    footerText: "Ver capacitaciones",
    href: "/hr/trainings",
    accentClass: "text-teal-600 dark:text-teal-400",
    accentBgClass: "bg-teal-50 dark:bg-teal-500/10",
    shadowColorClassName: "hover:shadow-teal-500/25 dark:hover:shadow-teal-500/25",
  },
  {
    icon: IncidentIcon,
    title: "Incidencias",
    description: "Retardos, faltas y otras incidencias: gravedad, estado y seguimiento.",
    footerText: "Ver incidencias",
    href: "/hr/incidents",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
