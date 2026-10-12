"use client";

import { Button } from "@/src/components/Button";
import { plural } from "@/src/utils/kpiFormat";
import {
  SAMPLE_SKU_LINK_BLOCK_COPY,
  sampleSkuRunLabel,
  type SampleSkuLinkBlock,
} from "../constants/sampleSkuLinking";
import type { SampleSkuRunProgress } from "../hooks/useSampleSkuLinking";

const listFormat = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

/**
 * Lo que la última vinculación dejó SIN resolver en tallas que siguen listas
 * para vincular. Lo calcula quien monta el aviso; deja de existir cuando empieza
 * otra corrida o cuando esas tallas quedan vinculadas.
 */
export interface SampleSkuLinkOutcome {
  /** Motivo por el que la corrida se detuvo antes de terminar, o `null`. */
  stopReason: string | null;
  /** Tallas que el backend rechazó y siguen sin vincular. */
  rejected: number;
}

interface SampleSkuLinkBannerProps {
  /** Tallas listas para vincular en todo el pedido. */
  linkableCount: number;
  /** Números de partida (columna "#") de las líneas que las tienen, en orden. */
  partidas: number[];
  /** Motivo por el que el usuario no ve la acción, o `null` si la ve. */
  block: SampleSkuLinkBlock | null;
  /** Hay una corrida de "Vincular todas" en curso en el pedido. */
  isRunning: boolean;
  /** Avance de esa corrida; `null` si se perdió (ver `useSampleSkuLinking`). */
  runProgress: SampleSkuRunProgress | null;
  /** Resultado pendiente de la última vinculación, o `null` si no dejó nada. */
  outcome: SampleSkuLinkOutcome | null;
  /** Hay una vinculación individual en curso: la corrida no puede empezar. */
  hasPendingSingle: boolean;
  onLinkAll: () => void;
}

/**
 * Aviso sobre la tabla de productos: cuántas tallas de muestra están listas
 * para vincular y en qué partidas, con la acción de vincularlas todas en una
 * sola corrida. Ahorra abrir el diálogo de cada línea para averiguarlo.
 *
 * Quien lo monta decide cuándo existe (alguna talla lista, o una corrida en
 * curso). Sin la acción —pedido cerrado o usuario sin permiso— conserva la
 * cuenta y dice el motivo en su lugar. Si la última vinculación se detuvo o
 * dejó tallas rechazadas, lo dice aquí de forma PERMANENTE (el toast dura unos
 * segundos); el motivo de cada talla está en el diálogo de su partida.
 */
export function SampleSkuLinkBanner({
  linkableCount,
  partidas,
  block,
  isRunning,
  runProgress,
  outcome,
  hasPendingSingle,
  onLinkAll,
}: SampleSkuLinkBannerProps) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-2.5"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-0.5">
        <p className="text-sm text-sky-800 dark:text-sky-200">
          {isRunning ? (
            <span className="font-semibold">{sampleSkuRunLabel(runProgress)}</span>
          ) : (
            <>
              <span className="font-semibold tabular-nums">
                {linkableCount} {plural(linkableCount, "talla lista", "tallas listas")}
              </span>{" "}
              para vincular en {plural(partidas.length, "la partida", "las partidas")}{" "}
              <span className="tabular-nums">{listFormat.format(partidas.map(String))}</span>
            </>
          )}
        </p>
        {!isRunning && outcome && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {outcome.stopReason && `La última vinculación se detuvo: ${outcome.stopReason}`}
            {outcome.stopReason && outcome.rejected > 0 && " "}
            {outcome.rejected > 0 &&
              `${outcome.rejected} ${plural(
                outcome.rejected,
                "talla fue rechazada",
                "tallas fueron rechazadas",
              )}; abre su partida para ver el motivo.`}
          </p>
        )}
      </div>
      {block ? (
        <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
          {SAMPLE_SKU_LINK_BLOCK_COPY[block]}
        </p>
      ) : (
        !isRunning && (
          <Button
            variant="primary"
            className="px-3! py-1.5! text-xs!"
            onClick={onLinkAll}
            disabled={hasPendingSingle}
          >
            Vincular todas
          </Button>
        )
      )}
    </div>
  );
}
