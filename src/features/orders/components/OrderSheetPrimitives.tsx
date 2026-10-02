import type React from "react";
import type { BadgeConfig } from "../constants/pedidoStatus";

// Piezas presentacionales de las hojas del detalle de pedido. Reproducen el
// ARMAZÓN visual del formulario de cotización (`QuoteForm`): secciones blancas
// `rounded-3xl` con icono, título y subtítulo, y paneles grises internos con
// su propio título. Son locales a pedidos a propósito: el formulario no exporta
// estas piezas (su JSX está atado a `form.Field`) y no se toca.

/** Badge de estatus/tipo/origen con la config de `pedidoStatus`. */
export function OrderBadge({ config }: { config: BadgeConfig }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function OrderChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}
    </span>
  );
}

/**
 * Sección de primer nivel, como las del formulario ("Información Comercial",
 * "Datos de Envío", "Detalle de Productos"). `badges` va pegado al título, en el
 * hueco donde el formulario pone su `headerBadge`.
 */
export function SheetSection({
  icon,
  title,
  subtitle,
  badges,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3 mb-6">
        {icon && (
          <div className="w-10 h-10 shrink-0 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
              {title}
            </h2>
            {badges}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Panel gris dentro de una sección, como "Datos de Facturación" o "Condiciones
 * de pago" en el formulario. `title` es el rótulo en mayúsculas; `heading`, un
 * título normal (el formulario usa los dos estilos según el panel).
 */
export function SheetPanel({
  title,
  heading,
  children,
  className = "",
}: {
  title?: string;
  heading?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5 ${className}`}
    >
      {title && (
        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-4">
          {title}
        </p>
      )}
      {heading && (
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">{heading}</h3>
      )}
      {children}
    </div>
  );
}

/**
 * Tarjeta suelta de la fila inferior del formulario (Observaciones; Cargos,
 * servicios y totales): mismo borde y superficie que `SheetSection`, sin
 * encabezado propio.
 */
export function SheetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-sm">
      {children}
    </div>
  );
}

/** Fila etiqueta/importe alineada a los extremos, como los totales del formulario. */
export function AmountRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          emphasis
            ? "font-semibold text-slate-800 dark:text-white"
            : "font-medium text-slate-700 dark:text-slate-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
