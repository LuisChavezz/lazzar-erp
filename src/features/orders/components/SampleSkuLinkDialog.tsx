"use client";

import { Button } from "@/src/components/Button";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { MainDialog } from "@/src/components/MainDialog";
import { useSampleSkuLinking } from "../hooks/useSampleSkuLinking";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import {
  lineProductName,
  sampleSkuLineProgress,
  sampleSkuTallaState,
  type SampleSkuTallaState,
} from "../utils/orderLines";

const PILL = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

/**
 * Presentación de cada estado. Mismas pastillas que el estado del alta de SKU
 * en pedidos especiales (`LineSkuStatus`). `hint` es el tooltip de "Revisar";
 * `action`, la etiqueta de la acción cuando el estado admite vincular.
 */
const STATE_CONFIG: Record<
  SampleSkuTallaState,
  { label: string; className: string; hint?: string; action?: string }
> = {
  none: {
    label: "Sin SKU",
    className:
      "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400",
  },
  linkable: {
    label: "Por vincular",
    className:
      "border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
    action: "Vincular",
  },
  linked: {
    label: "Vinculado",
    className:
      "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  orphan: {
    label: "Revisar",
    className:
      "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hint: "Esta talla tiene un SKU vinculado, pero Producción ya no muestra un SKU para ella.",
  },
  out_of_sync: {
    label: "Revisar",
    className:
      "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hint: "El SKU vinculado no coincide con el SKU de producción actual. Vuelve a vincular para actualizarlo.",
    action: "Re-vincular",
  },
};

const SKU_CELL = "px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap";

interface SampleSkuLinkDialogProps {
  pedidoId: number;
  /** Cotización de origen (`PedidoDetail.cotizacion`), para releerla al vincular. */
  cotizacionId: number | null;
  /**
   * La línea de muestra, tomada del detalle VIGENTE por quien monta el diálogo:
   * así cada relectura (tras vincular, o por otra pantalla) se refleja aquí.
   */
  linea: PedidoDetalleLinea;
  /**
   * El usuario VE las acciones (permiso de Mesa de Control y pedido no
   * terminado). Es solo visibilidad: quién puede vincular lo decide el backend
   * (ver `useSampleSkuLinking`). Sin ella el diálogo es de solo lectura.
   */
  canLink: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * SKU de muestra por talla de UNA línea: el SKU que Producción tiene disponible,
 * el ya vinculado y su estado, con la acción de vincular talla por talla o todas
 * las pendientes ("Por vincular"; las que están por revisar nunca entran en la
 * corrida masiva).
 *
 * No hay desvincular ni forma de elegir el SKU: el backend copia el suyo.
 */
export function SampleSkuLinkDialog({
  pedidoId,
  cotizacionId,
  linea,
  canLink,
  open,
  onOpenChange,
}: SampleSkuLinkDialogProps) {
  const { linkOne, linkAll, pendingTallaIds, isBulkRunning, bulkProgress, bulkFailures } =
    useSampleSkuLinking({ pedidoId, cotizacionId });

  const rows = linea.tallas.map((talla) => ({ talla, state: sampleSkuTallaState(talla) }));
  const linkableIds = rows.filter((row) => row.state === "linkable").map((row) => row.talla.id);
  const { linked, total } = sampleSkuLineProgress(linea);
  const anySinglePending = pendingTallaIds.length > 0;

  const bulkLabel = !isBulkRunning
    ? `Vincular todas (${linkableIds.length})`
    : bulkProgress === null
      ? "Vinculando..."
      : bulkProgress.currentTallaId === null
        ? "Actualizando..."
        : `Vinculando ${bulkProgress.done + 1} de ${bulkProgress.total}...`;

  return (
    <MainDialog
      open={open}
      // Con la corrida masiva en curso el diálogo no se cierra (X, Escape ni
      // "Cerrar"): el avance vive aquí y cerrarlo lo dejaría sin seguimiento.
      onOpenChange={(next) => {
        if (!next && isBulkRunning) return;
        onOpenChange(next);
      }}
      showCloseButton={!isBulkRunning}
      maxWidth="760px"
      title="SKU de muestra por talla"
      description={`${lineProductName(linea)}${linea.color_nombre ? ` · ${linea.color_nombre}` : ""}`}
      actionButtonClose={false}
      actionButton={
        canLink && (linkableIds.length > 0 || isBulkRunning) ? (
          <Button
            variant="primary"
            onClick={() => linkAll(linkableIds)}
            disabled={isBulkRunning || anySinglePending}
          >
            {bulkLabel}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
          {isBulkRunning ? (
            bulkLabel
          ) : (
            <>
              <span className="tabular-nums">
                {linked} de {total}
              </span>{" "}
              talla{total === 1 ? "" : "s"} con SKU vinculado.
            </>
          )}
        </p>

        {rows.length === 0 ? (
          <EmptyLines>Esta línea no tiene tallas.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Talla</th>
                <th className="px-3 py-2 font-medium">SKU de producción</th>
                <th className="px-3 py-2 font-medium">SKU vinculado</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                {canLink && <th className="px-3 py-2 font-medium text-right">Acción</th>}
              </>
            }
          >
            {rows.map(({ talla, state }) => {
              const config = STATE_CONFIG[state];
              const isLinking =
                pendingTallaIds.includes(talla.id) ||
                (isBulkRunning && bulkProgress?.currentTallaId === talla.id);
              const failure = bulkFailures[talla.id];
              return (
                <tr key={talla.id} className="align-top">
                  <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {talla.talla_nombre}
                  </td>
                  <td className={SKU_CELL}>{talla.sku_produccion || "—"}</td>
                  <td className={SKU_CELL}>{talla.sku_muestra || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`${PILL} ${config.className} ${config.hint ? "cursor-help" : ""}`}
                      title={config.hint}
                    >
                      {config.label}
                      {config.hint && <span className="sr-only">: {config.hint}</span>}
                    </span>
                    {failure && (
                      <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{failure}</p>
                    )}
                  </td>
                  {canLink && (
                    <td className="px-3 py-2 text-right">
                      {config.action && (
                        <Button
                          variant="secondary"
                          className="px-3! py-1! text-xs!"
                          onClick={() => linkOne(talla.id)}
                          disabled={isLinking || isBulkRunning}
                          aria-label={`${config.action} el SKU de la talla ${talla.talla_nombre}`}
                        >
                          {isLinking ? "Vinculando..." : config.action}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </div>
    </MainDialog>
  );
}
