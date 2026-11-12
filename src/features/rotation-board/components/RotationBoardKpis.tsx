"use client";

import { FilterIcon } from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { ROTATION_ESTADO_CONFIG } from "../constants/rotationBoardStatus";
import type { RotationBoardShortcut } from "../utils/rotationBoardShortcuts";
import type { RotationBoardResumen } from "../interfaces/rotation-board.interface";
import { formatPieces } from "../utils/rotationBoardFormat";

interface RotationBoardKpisProps {
  /** `undefined` mientras no hay respuesta (o falló la carga inicial). */
  resumen: RotationBoardResumen | undefined;
  isLoading: boolean;
  /** Cada tarjeta está activa si SU filtro está puesto (pueden ser varias). */
  isActive: (shortcut: RotationBoardShortcut) => boolean;
  onToggle: (shortcut: RotationBoardShortcut) => void;
}

interface CardSpec {
  shortcut: RotationBoardShortcut;
  label: string;
  hint: string;
  dot: string;
  value: (resumen: RotationBoardResumen) => number;
}

/**
 * Las cuatro tarjetas del tablero, cada una un atajo de filtro. Salen del
 * `resumen`, que el backend NO acota por `estado` ni `solo_candidatos`: al
 * filtrar desde una tarjeta las cifras no cambian, solo la tabla.
 */
const CARDS: CardSpec[] = [
  {
    shortcut: "RESURTIR",
    label: "Resurtir",
    hint: "Cobertura por debajo del objetivo; ordena por resurtido sugerido",
    dot: ROTATION_ESTADO_CONFIG.RESURTIR.dot,
    value: (resumen) => resumen.por_estado.RESURTIR,
  },
  {
    shortcut: "SOBREINVENTARIO",
    label: "Sobreinventario",
    hint: "Cobertura mayor al doble del objetivo",
    dot: ROTATION_ESTADO_CONFIG.SOBREINVENTARIO.dot,
    value: (resumen) => resumen.por_estado.SOBREINVENTARIO,
  },
  {
    shortcut: "LENTO",
    label: "Lento",
    hint: "Clase C con venta en el periodo",
    dot: ROTATION_ESTADO_CONFIG.LENTO.dot,
    value: (resumen) => resumen.por_estado.LENTO,
  },
  {
    shortcut: "CANDIDATOS",
    label: "Candidatos a descontinuar",
    hint: "Sin venta en el umbral, o lentos con tendencia negativa",
    dot: "bg-rose-500",
    value: (resumen) => resumen.candidatos_descontinuar,
  },
];

const CARD_CLS =
  "group w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-default disabled:hover:bg-white dark:disabled:hover:bg-white/5";

/**
 * Patrón del embudo de oportunidades (`OpportunityFunnel`): cada tarjeta es un
 * BOTÓN con `aria-pressed`; la activa se marca con contorno y el texto "Filtro
 * activo", no solo con color. Pulsar la activa quita el filtro.
 */
export function RotationBoardKpis({
  resumen,
  isLoading,
  isActive: isShortcutActive,
  onToggle,
}: RotationBoardKpisProps) {
  return (
    <section aria-label="Indicadores del tablero de rotación">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS.map((card) => {
          const isActive = isShortcutActive(card.shortcut);
          const value = resumen ? card.value(resumen) : undefined;
          const total = resumen?.articulos;
          return (
            <li key={card.shortcut}>
              <button
                type="button"
                aria-pressed={isActive}
                disabled={!resumen}
                title={isActive ? `Quitar el filtro "${card.label}"` : card.hint}
                onClick={() => onToggle(card.shortcut)}
                className={`${CARD_CLS} ${
                  isActive
                    ? "ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    : ""
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${card.dot}`} aria-hidden="true" />
                  <span className="truncate">{card.label}</span>
                </span>
                <span className="mt-1.5 flex items-baseline justify-between gap-2">
                  {value !== undefined ? (
                    <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
                      {formatPieces(value)}
                    </span>
                  ) : isLoading ? (
                    <LoadingSkeleton className="h-8 w-16" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">—</span>
                  )}
                  {total !== undefined && (
                    <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                      de {formatPieces(total)}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex h-4 items-center text-[11px]">
                  {isActive && (
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400">
                      <FilterIcon className="h-3 w-3" aria-hidden="true" />
                      Filtro activo
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
