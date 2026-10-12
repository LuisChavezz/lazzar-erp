"use client";

import { Button } from "@/src/components/Button";
import {
  SAMPLE_SKU_LINK_BLOCK_COPY,
  type SampleSkuLinkBlock,
} from "../constants/sampleSkuLinking";
import type { SampleSkuRunProgress } from "../hooks/useSampleSkuLinking";

const listFormat = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

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
 * cuenta y dice el motivo en su lugar.
 */
export function SampleSkuLinkBanner({
  linkableCount,
  partidas,
  block,
  isRunning,
  runProgress,
  hasPendingSingle,
  onLinkAll,
}: SampleSkuLinkBannerProps) {
  const runningLabel = !runProgress
    ? "Vinculando..."
    : runProgress.refreshing
      ? "Actualizando..."
      : `Vinculando ${Math.min(runProgress.processed + 1, runProgress.total)} de ${runProgress.total}...`;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-2.5"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-sky-800 dark:text-sky-200">
        {isRunning ? (
          <span className="font-semibold">{runningLabel}</span>
        ) : (
          <>
            <span className="font-semibold tabular-nums">
              {linkableCount} {linkableCount === 1 ? "talla lista" : "tallas listas"}
            </span>{" "}
            para vincular en {partidas.length === 1 ? "la partida" : "las partidas"}{" "}
            <span className="tabular-nums">{listFormat.format(partidas.map(String))}</span>
          </>
        )}
      </p>
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
