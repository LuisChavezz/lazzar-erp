import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { KpiTrendIcon } from "./Icons";
import { KpiInfoPopover } from "./KpiInfoPopover";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { clampPercentage } from "@/src/utils/percentage";

export type KpiStatus = "positive" | "negative" | "neutral";

export interface KpiItem {
  label: string;
  /**
   * Casi siempre un string. Admite un nodo para valores compuestos (p.ej. un
   * importe por moneda en el detalle de cliente); se pinta dentro del `<h3>`,
   * así que debe ser contenido en línea (`<span>`, con `block` si hace falta
   * apilar).
   */
  value: ReactNode;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconBgClass: string;
  iconClass: string;
  trendLabel?: string;
  status?: KpiStatus;
  subLabel?: string;
  progress?: number;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * Tarjeta de la variante compacta. Solo admite lo que esa variante pinta: las
 * props de la tarjeta normal que aquí no tienen lugar están vetadas con `never`
 * para que el typecheck las rechace (incluso si llegan por un spread) en vez de
 * descartarlas en silencio.
 */
export interface KpiCompactItem {
  label: string;
  value: ReactNode;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Color del icono en línea, de la barra y del acento superior. */
  iconClass: string;
  trendLabel?: string;
  status?: KpiStatus;
  progress?: number;
  /**
   * Insignia propia junto al valor (p. ej. un semáforo que decide el backend,
   * con `KpiStatusDot`). Independiente de `trendLabel`, cuya flecha de
   * tendencia no tiene sentido para un semáforo.
   */
  badge?: ReactNode;
  /**
   * La fuente del indicador dice que no está disponible: en vez del valor se
   * pinta "No disponible", sin cifra ni barra, y el ⓘ muestra este motivo.
   */
  unavailableReason?: string;
  /** Oculta la barra (p. ej. un conteo sin meta, donde "llena" no significa nada). */
  hideProgress?: boolean;
  /**
   * Texto largo secundario para el popover del ⓘ (p. ej. una nota del
   * backend). En una tarjeta no disponible el ⓘ muestra `unavailableReason`.
   */
  info?: string;
  /** Acción a la derecha de la fila del valor (p. ej. abrir un drill-down). */
  action?: ReactNode;
  /**
   * Detalle corto junto a la barra (p. ej. "Meta 95% · 2/3 a tiempo"). Si no
   * cabe se recorta, con el texto completo en `title`; por eso es string.
   */
  detail?: string;
  /** Texto completo para el `title` del detalle cuando el visible es una versión corta. */
  detailTitle?: string;
  subLabel?: never;
  iconBgClass?: never;
  actionLabel?: never;
  actionHref?: never;
  footer?: never;
}

type KpiGridProps =
  | { items: KpiItem[]; compact?: false }
  /** Variante compacta (ver `KpiCompactCard`). */
  | { items: KpiCompactItem[]; compact: true };

type KpiCardProps = { item: KpiItem; compact?: false } | { item: KpiCompactItem; compact: true };

const statusStyles: Record<KpiStatus, { text: string; bg: string }> = {
  positive: { text: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  negative: { text: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  neutral: { text: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
};

/**
 * Una tarjeta KPI sola, extraída de `KpiGrid` para que un consumidor que
 * necesite mezclar tarjetas con OTRO widget en la misma fila (p. ej.
 * `PickingStats`, que le agrega el desglose por prioridad a la derecha de
 * dos tarjetas) pueda armar su propia grilla en vez de duplicar este
 * markup. `KpiGrid` sigue siendo el camino corto para el caso común (solo
 * tarjetas): internamente ahora es un `.map()` sobre este mismo componente,
 * así que su salida no cambia.
 */
export function KpiCard(props: KpiCardProps) {
  if (props.compact) return <KpiCompactCard item={props.item} />;
  const { item } = props;
  const status = item.status ?? "neutral";
  const badge = statusStyles[status];
  const Icon = item.icon;
  const progress = item.progress ?? 100;
  // El guardia de finitud se queda AQUÍ y no baja al helper: es propio de
  // esta tarjeta, cuyo `progress` es opcional y puede llegar con
  // cualquier número. `clampPercentage` solo aporta el acotado.
  const normalizedProgress = Number.isFinite(progress) ? clampPercentage(progress) : 0;

  return (
    <div
      role="listitem"
      className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${item.iconClass}`}
      />
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            {item.label}
          </span>
          {item.subLabel ? (
            <span className="text-xs text-slate-500 dark:text-slate-300 mt-1">{item.subLabel}</span>
          ) : null}
        </div>
        <div
          className={`p-2 rounded-lg ${item.iconBgClass} ${item.iconClass} shadow-[0_0_15px_rgba(15,23,42,0.08)]`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className={`text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono truncate`}>
          {item.value}
        </h3>
        {item.trendLabel ? (
          <span
            className={`flex items-center text-xs font-semibold ${badge.text} ${badge.bg} px-1.5 py-0.5 rounded`}
          >
            <KpiTrendIcon className="w-3 h-3 mr-0.5" negative={status === "negative"} />
            {item.trendLabel}
          </span>
        ) : null}
      </div>
      <div className={`h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${item.iconClass}`}>
        <div className="h-full bg-current rounded-full" style={{ width: `${normalizedProgress}%` }} />
      </div>
      {item.actionLabel && item.actionHref ? (
        <div className="mt-3">
          <Link
            href={item.actionHref}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all duration-200 ease-in-out"
          >
            {item.actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Variante compacta (~120px) para filas de indicadores encima de un listado.
 * Tres filas: título con icono en línea y ⓘ (`info`, o el motivo si no está
 * disponible); valor + `badge`/`trendLabel` con `action` a la derecha; barra
 * con `detail` al lado (o solo `detail` con `hideProgress`). El texto largo va
 * en `info` y la acción en `action` (ver `KpiCompactItem`).
 */
function KpiCompactCard({ item }: { item: KpiCompactItem }) {
  const status = item.status ?? "neutral";
  const trend = statusStyles[status];
  const Icon = item.icon;
  const isUnavailable = item.unavailableReason !== undefined;
  // No disponible: el ⓘ explica SIEMPRE el motivo, aunque también venga `info`.
  const info = isUnavailable ? item.unavailableReason : item.info;
  const progress = item.progress ?? 100;
  const normalizedProgress = Number.isFinite(progress) ? clampPercentage(progress) : 0;
  const showBar = !isUnavailable && !item.hideProgress;
  const showDetail = !isUnavailable && Boolean(item.detail);

  return (
    <div
      role="listitem"
      className={`group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3 shadow-sm hover:shadow-lg transition-all duration-300 ${KPI_COMPACT_CARD_HEIGHT_CLASS}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${item.iconClass}`}
      />
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconClass}`} aria-hidden="true" />
        <span className="flex-1 min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          {item.label}
        </span>
        {info ? <KpiInfoPopover label={item.label} text={info} /> : null}
      </div>
      {/* `flex-wrap`: el valor nunca se recorta; si valor + insignia + acción
          no caben en el ancho de la tarjeta, la acción baja a su propia línea. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 min-h-8">
        {isUnavailable ? (
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">No disponible</span>
        ) : (
          <>
            <h3 className="shrink-0 text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
              {item.value}
            </h3>
            {item.trendLabel ? (
              <span
                className={`flex items-center shrink-0 text-xs font-semibold ${trend.text} ${trend.bg} px-1.5 py-0.5 rounded`}
              >
                <KpiTrendIcon className="w-3 h-3 mr-0.5" negative={status === "negative"} />
                {item.trendLabel}
              </span>
            ) : null}
            {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
            {item.action ? <span className="ml-auto shrink-0">{item.action}</span> : null}
          </>
        )}
      </div>
      {showBar || showDetail ? (
        <div className="mt-2 flex items-center gap-3">
          {showBar ? (
            <div className={`h-1 flex-1 min-w-12 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${item.iconClass}`}>
              <div className="h-full bg-current rounded-full" style={{ width: `${normalizedProgress}%` }} />
            </div>
          ) : null}
          {showDetail ? (
            // Tope del 70% solo junto a la barra; sin barra ocupa la fila entera.
            // `title`: si se recorta, el texto completo sigue a mano.
            <span
              title={item.detailTitle ?? item.detail}
              className={`min-w-0 truncate text-xs text-slate-500 dark:text-slate-400 ${showBar ? "shrink-0 max-w-[70%]" : ""}`}
            >
              {item.detail}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Contenedor de consulta de la grilla compacta: las columnas dependen del ancho
 * de ESTE contenedor (container queries), no del viewport, así que dan igual la
 * barra lateral anclada o colapsada y la página que lo monte.
 *
 * Limitación: `@container` (`container-type: inline-size`) ignora a sus hijos al
 * calcular su ancho intrínseco, así que dentro de un padre `w-fit` o de un ítem
 * flex sin ancho definido mide 0px y las tarjetas se aplastan. Montar la grilla
 * compacta en un contenedor con ancho real (flujo de bloque, `w-full`, etc.).
 */
const KPI_COMPACT_CONTAINER_CLASS = "@container";

/**
 * Columnas de la grilla compacta según el ancho del contenedor (`@container`).
 */
// Tarjeta mínima medida: 259px (peor caso: amarillo "94.9%" + "Cerca de la meta" + acción,
// línea "Meta 95.0% · 2 de 3 a tiempo" y el título más largo, sin partir ni recortar).
// 2 columnas: 2×259 + 16 de gap = 534px → 34rem (544px).
// 4 columnas: 4×259 + 3×16 = 1084px → 68.75rem (1100px, con margen).
const KPI_COMPACT_GRID_CLASS =
  "grid grid-cols-1 @min-[34rem]:grid-cols-2 @min-[68.75rem]:grid-cols-4 items-stretch gap-4";

const KPI_GRID_CLASS = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch gap-4";

/** Alto mínimo de la tarjeta compacta: igual con o sin barra/detalle, y igual al skeleton. */
const KPI_COMPACT_CARD_HEIGHT_CLASS = "min-h-[104px]";

export default function KpiGrid(props: KpiGridProps) {
  if (props.compact) {
    return (
      <div className={KPI_COMPACT_CONTAINER_CLASS}>
        <div className={KPI_COMPACT_GRID_CLASS} role="list">
          {props.items.map((item, index) => (
            <KpiCard key={`${item.label}-${index}`} item={item} compact />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={KPI_GRID_CLASS} role="list">
      {props.items.map((item, index) => (
        <KpiCard key={`${item.label}-${index}`} item={item} />
      ))}
    </div>
  );
}

/**
 * Skeleton de `KpiGrid`: misma rejilla (y, en compacto, mismo contenedor y alto
 * mínimo) que la grilla cargada, para que no haya salto al llegar los datos.
 */
export function KpiGridSkeleton({
  count = 4,
  compact = false,
  label = "Cargando indicadores",
}: {
  count?: number;
  compact?: boolean;
  label?: string;
}) {
  const cells = Array.from({ length: count }, (_, index) => (
    <LoadingSkeleton key={index} className={compact ? KPI_COMPACT_CARD_HEIGHT_CLASS : "h-40"} />
  ));
  if (compact) {
    return (
      <div className={KPI_COMPACT_CONTAINER_CLASS}>
        <div className={KPI_COMPACT_GRID_CLASS} aria-busy="true" aria-label={label}>
          {cells}
        </div>
      </div>
    );
  }
  return (
    <div className={KPI_GRID_CLASS} aria-busy="true" aria-label={label}>
      {cells}
    </div>
  );
}
