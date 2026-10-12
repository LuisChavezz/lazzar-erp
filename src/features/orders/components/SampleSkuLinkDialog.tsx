"use client";

import { Button } from "@/src/components/Button";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { MainDialog } from "@/src/components/MainDialog";
import { skuStatusPillClass, type SkuStatusPillTone } from "../constants/skuStatusPills";
import type { SampleSkuBulkRun } from "../hooks/useSampleSkuLinking";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import {
  lineProductName,
  sampleSkuLineProgress,
  sampleSkuTallaState,
  withLinkedSampleSkus,
  type SampleSkuTallaState,
} from "../utils/orderLines";

/**
 * Presentación de cada estado. `hint` es el tooltip de "Revisar"; `action`, la
 * etiqueta de la acción cuando el estado admite vincular.
 */
const STATE_CONFIG: Record<
  SampleSkuTallaState,
  { label: string; tone: SkuStatusPillTone; hint?: string; action?: string }
> = {
  none: { label: "Sin SKU", tone: "slate" },
  linkable: { label: "Por vincular", tone: "sky", action: "Vincular" },
  linked: { label: "Vinculado", tone: "emerald" },
  orphan: {
    label: "Revisar",
    tone: "amber",
    hint: "Esta talla tiene un SKU vinculado, pero Producción ya no muestra un SKU para ella.",
  },
  out_of_sync: {
    label: "Revisar",
    tone: "amber",
    hint: "El SKU vinculado no coincide con el SKU de producción actual. Vuelve a vincular para actualizarlo.",
    action: "Re-vincular",
  },
};

const SKU_CELL = "px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap";

interface SampleSkuLinkDialogProps {
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
  /** Última corrida de "Vincular todas" de ESTA línea, si la hubo. */
  run: SampleSkuBulkRun | undefined;
  /** Línea del pedido con una corrida en curso (puede ser otra), o `null`. */
  runningLineaId: number | null;
  /** Tallas con una vinculación individual en curso. */
  pendingTallaIds: number[];
  onLinkOne: (tallaId: number) => void;
  onLinkAll: (tallaIds: number[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * SKU de muestra por talla de UNA línea: el SKU que Producción tiene disponible,
 * el ya vinculado y su estado, con la acción de vincular talla por talla o todas
 * las pendientes ("Por vincular"; las que están por revisar nunca entran en la
 * corrida masiva).
 *
 * Es solo la VISTA: el estado de la vinculación (corrida en curso, avance,
 * resultados) vive en la página (`useSampleSkuLinking`). Por eso se puede cerrar
 * en cualquier momento, también a media corrida, y al reabrirlo muestra cómo va.
 * Cada talla procesada se ve con su resultado al instante: las vinculadas, por
 * la superposición sobre el detalle en caché; las fallidas, con el motivo del
 * backend.
 *
 * No hay desvincular ni forma de elegir el SKU: el backend copia el suyo.
 */
export function SampleSkuLinkDialog({
  linea,
  canLink,
  run,
  runningLineaId,
  pendingTallaIds,
  onLinkOne,
  onLinkAll,
  open,
  onOpenChange,
}: SampleSkuLinkDialogProps) {
  const isRunningHere = runningLineaId === linea.id;
  // Solo una corrida por pedido a la vez: la de otra línea bloquea las acciones
  // de esta, y se dice por qué.
  const isRunningElsewhere = runningLineaId !== null && !isRunningHere;

  const shownLinea = withLinkedSampleSkus(linea, run?.linkedSkus ?? {});
  const rows = shownLinea.tallas.map((talla) => ({ talla, state: sampleSkuTallaState(talla) }));
  const linkableIds = rows.filter((row) => row.state === "linkable").map((row) => row.talla.id);
  const { linked, total } = sampleSkuLineProgress(shownLinea);
  const anySinglePending = pendingTallaIds.length > 0;

  // Sin `run` con la corrida en curso: la página se volvió a montar a media
  // corrida y el avance se perdió (la corrida no).
  const processed = run ? Object.keys(run.linkedSkus).length + Object.keys(run.failures).length : 0;
  const runningLabel = !run
    ? "Vinculando..."
    : run.currentTallaId === null
      ? "Actualizando..."
      : `Vinculando ${processed + 1} de ${run.total}...`;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      title="SKU de muestra por talla"
      description={`${lineProductName(linea)}${linea.color_nombre ? ` · ${linea.color_nombre}` : ""}`}
      actionButtonClose={false}
      actionButton={
        canLink && (linkableIds.length > 0 || isRunningHere) ? (
          <Button
            variant="primary"
            onClick={() => onLinkAll(linkableIds)}
            disabled={runningLineaId !== null || anySinglePending}
          >
            {isRunningHere ? runningLabel : `Vincular todas (${linkableIds.length})`}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <div className="space-y-1 text-xs" role="status" aria-live="polite">
          <p className="text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">
              {linked} de {total}
            </span>{" "}
            talla{total === 1 ? "" : "s"} con SKU vinculado.
            {isRunningHere && ` ${runningLabel} Puedes cerrar esta ventana; la vinculación continúa.`}
          </p>
          {!isRunningHere && run?.stopReason && (
            <p className="text-amber-700 dark:text-amber-400">
              La última vinculación se detuvo antes de terminar: {run.stopReason}
            </p>
          )}
          {canLink && isRunningElsewhere && (
            <p className="text-amber-700 dark:text-amber-400">
              Hay una vinculación en curso en otra línea de este pedido. Espera a que termine para
              vincular aquí.
            </p>
          )}
        </div>

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
                (isRunningHere && run?.currentTallaId === talla.id);
              // El fallo de la corrida deja de mostrarse si la talla ya quedó
              // vinculada por otra vía (una relectura lo trae así).
              const failure = state === "linked" ? undefined : run?.failures[talla.id];
              return (
                <tr key={talla.id} className="align-top">
                  <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {talla.talla_nombre}
                  </td>
                  <td className={SKU_CELL}>{talla.sku_produccion || "—"}</td>
                  <td className={SKU_CELL}>{talla.sku_muestra || "—"}</td>
                  <td className="px-3 py-2">
                    {failure ? (
                      <>
                        <span className={skuStatusPillClass("rose")}>No se vinculó</span>
                        <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                          {failure}
                        </p>
                      </>
                    ) : (
                      <span
                        className={`${skuStatusPillClass(config.tone)} ${config.hint ? "cursor-help" : ""}`}
                        title={config.hint}
                      >
                        {config.label}
                        {config.hint && <span className="sr-only">: {config.hint}</span>}
                      </span>
                    )}
                  </td>
                  {canLink && (
                    <td className="px-3 py-2 text-right">
                      {config.action && (
                        <Button
                          variant="secondary"
                          className="px-3! py-1! text-xs!"
                          onClick={() => onLinkOne(talla.id)}
                          disabled={isLinking || runningLineaId !== null}
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
