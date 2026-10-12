"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { MainDialog } from "@/src/components/MainDialog";
import { useSizes } from "@/src/features/sizes/hooks/useSizes";
import { plural } from "@/src/utils/kpiFormat";
import {
  SAMPLE_SKU_LINK_BLOCK_COPY,
  sampleSkuRunLabel,
  type SampleSkuLinkBlock,
} from "../constants/sampleSkuLinking";
import { skuStatusPillClass, type SkuStatusPillTone } from "../constants/skuStatusPills";
import type { SampleSkuBulkRun, SampleSkuRunProgress } from "../hooks/useSampleSkuLinking";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import {
  lineProductName,
  sampleSkuLineSummary,
  sampleSkuTallaState,
  withLinkedSampleSkus,
  type SampleSkuTallaState,
} from "../utils/orderLines";

/**
 * Presentación de cada estado. `hint` explica el estado: en "Revisar" es el
 * tooltip de la pastilla; en "Sin SKU" va escrito bajo ella, porque es la razón
 * de que la fila no tenga acción (salvo cuando TODA la línea está sin SKU: ahí
 * lo dice una sola vez el aviso de arriba). `action` es la etiqueta de la acción cuando
 * el estado admite vincular.
 */
const STATE_CONFIG: Record<
  SampleSkuTallaState,
  { label: string; tone: SkuStatusPillTone; hint?: string; action?: string }
> = {
  none: { label: "Sin SKU", tone: "slate", hint: "Producción aún no genera el SKU" },
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
const NOTE = "text-amber-700 dark:text-amber-400";

interface SampleSkuLinkDialogProps {
  /**
   * La línea de muestra, tomada del detalle VIGENTE por quien monta el diálogo:
   * así cada relectura (tras vincular, o por otra pantalla) se refleja aquí.
   */
  linea: PedidoDetalleLinea;
  /**
   * Motivo por el que el usuario no ve las acciones (pedido cerrado o sin
   * permiso), o `null` si las ve. Es solo visibilidad: quién puede vincular lo
   * decide el backend (ver `useSampleSkuLinking`). Con motivo, el diálogo es de
   * solo lectura y lo dice.
   */
  block: SampleSkuLinkBlock | null;
  /** Lo que la última corrida de "Vincular todas" hizo en ESTA línea, si la hubo. */
  run: SampleSkuBulkRun | undefined;
  /** Líneas de la corrida en curso en el pedido (puede no incluir esta). */
  runningLineaIds: number[];
  /** Avance global de esa corrida. */
  runProgress: SampleSkuRunProgress | null;
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
 * Cuando NO se puede vincular, lo dice en el sitio: la talla sin SKU de
 * producción, bajo su estado; la línea entera sin SKU, con un solo aviso
 * arriba; el pedido cerrado o la falta de permiso, con una nota. La columna
 * "Acción" solo existe si alguna fila tiene acción, y no cambia mientras una
 * corrida pasa por la línea.
 *
 * Las filas van en el orden del catálogo de tallas y NO se pintan hasta tenerlo:
 * nunca se reordenan bajo el cursor.
 *
 * No hay desvincular ni forma de elegir el SKU: el backend copia el suyo.
 */
/**
 * Pide el catálogo de tallas sin pintar nada. La página del pedido lo monta
 * cuando el pedido tiene líneas de muestra, para que el diálogo lo encuentre en
 * caché al abrirse. Es un componente y no una llamada al hook en la página
 * porque la condición (¿hay muestras?) solo se conoce con el pedido ya cargado.
 */
export function SampleSkuSizeCatalogPrefetch() {
  useSizes();
  return null;
}

export function SampleSkuLinkDialog({
  linea,
  block,
  run,
  runningLineaIds,
  runProgress,
  pendingTallaIds,
  onLinkOne,
  onLinkAll,
  open,
  onOpenChange,
}: SampleSkuLinkDialogProps) {
  // Orden de las tallas: el del CATÁLOGO (`GET /catalogo/talla/`, que el
  // backend entrega en su orden canónico: XCH, CH, M, G…), no el de la
  // respuesta del pedido, que es el de captura. Una talla que ya no está en el
  // catálogo (inactiva) va al final, en el orden del pedido.
  //
  // El orden se FIJA una vez por apertura, en cuanto el catálogo deja de
  // cargar, y hasta entonces no hay filas: si se pintaran antes, saltarían al
  // llegar la respuesta y un clic podría caer en otra talla. Si la carga falló,
  // `sizes` viene vacío y queda fijado el orden del pedido; un reintento que
  // llegue después ya no reordena (el diálogo se desmonta al cerrar, así que la
  // siguiente apertura vuelve a decidir).
  const { sizes, isLoading: isLoadingSizes } = useSizes();
  const [catalogIndex, setCatalogIndex] = useState<Map<number, number> | null>(null);
  if (catalogIndex === null && !isLoadingSizes) {
    setCatalogIndex(new Map(sizes.map((size, index) => [size.id, index])));
  }
  const rank = (tallaId: number) => catalogIndex?.get(tallaId) ?? Number.MAX_SAFE_INTEGER;

  const isRunning = runningLineaIds.length > 0;
  const isRunningHere = runningLineaIds.includes(linea.id);
  // Solo una corrida por pedido a la vez: la de otra línea bloquea las acciones
  // de esta, y se dice por qué.
  const isRunningElsewhere = isRunning && !isRunningHere;

  const shownLinea = withLinkedSampleSkus(linea, run?.linkedSkus ?? {});
  const rows = shownLinea.tallas
    .map((talla) => ({ talla, state: sampleSkuTallaState(talla) }))
    // `sort` es estable: las tallas de igual rango conservan su orden.
    .sort((a, b) => rank(a.talla.talla) - rank(b.talla.talla));
  const { status, withSku, linked, linkableIds, withoutSku } = sampleSkuLineSummary(shownLinea);
  const anySinglePending = pendingTallaIds.length > 0;

  const canLink = block === null;
  // ¿Alguna fila admite acción? Decide si existe la columna y si la nota de
  // bloqueo viene al caso (sin nada que vincular no hay nada que explicar).
  const hasActionableRows = rows.some((row) => STATE_CONFIG[row.state].action);
  // Con una corrida pasando por la línea la columna se queda, aunque la
  // superposición ya haya dejado todas las filas vinculadas: si no, la tabla
  // perdería una columna a media corrida (y la recuperaría si una talla falla).
  const showActions = canLink && (hasActionableRows || isRunningHere);
  // Línea sin NINGÚN SKU de producción: no es que falte vincular, es que
  // Producción no los ha generado. Lo dice el aviso de arriba, una vez; las
  // filas no lo repiten.
  const lineWithoutSkus = rows.length > 0 && rows.every((row) => row.state === "none");
  const isEmptyLine = status === "empty";
  const runningLabel = sampleSkuRunLabel(runProgress);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      title="SKU de muestra por talla"
      description={`${lineProductName(linea)}${linea.color_nombre ? ` · ${linea.color_nombre}` : ""}`}
      actionButtonClose={false}
      actionButton={
        canLink && catalogIndex !== null && (linkableIds.length > 0 || isRunningHere) ? (
          <Button
            variant="primary"
            onClick={() => onLinkAll(linkableIds)}
            disabled={isRunning || anySinglePending}
          >
            {isRunningHere ? runningLabel : `Vincular todas (${linkableIds.length})`}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <div className="space-y-1 text-xs" role="status" aria-live="polite">
          {isEmptyLine ? null : lineWithoutSkus ? (
            <p className={NOTE}>
              Producción aún no genera los SKU de esta línea, así que todavía no hay nada que
              vincular.
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                {linked} de {withSku}
              </span>{" "}
              {plural(withSku, "talla con SKU vinculada", "tallas con SKU vinculadas")}
              {withoutSku > 0 &&
                ` · ${withoutSku} ${plural(withoutSku, "talla", "tallas")} sin SKU de producción`}
              .
              {isRunningHere &&
                ` ${runningLabel} Puedes cerrar esta ventana; la vinculación continúa.`}
            </p>
          )}
          {!isRunningHere && run?.stopReason && linkableIds.length > 0 && (
            <p className={NOTE}>
              La última vinculación se detuvo antes de terminar: {run.stopReason}
            </p>
          )}
          {block && hasActionableRows && (
            <p className={NOTE}>{SAMPLE_SKU_LINK_BLOCK_COPY[block]}.</p>
          )}
          {canLink && isRunningElsewhere && (
            <p className={NOTE}>
              Hay una vinculación en curso en otra línea de este pedido. Espera a que termine para
              vincular aquí.
            </p>
          )}
        </div>

        {isEmptyLine ? (
          <EmptyLines>Esta línea no tiene tallas capturadas.</EmptyLines>
        ) : catalogIndex === null ? (
          <EmptyLines>Cargando tallas...</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Talla</th>
                <th className="px-3 py-2 font-medium">SKU de producción</th>
                <th className="px-3 py-2 font-medium">SKU vinculado</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                {showActions && <th className="px-3 py-2 font-medium text-right">Acción</th>}
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
                    ) : state === "none" && !lineWithoutSkus ? (
                      <>
                        <span className={skuStatusPillClass(config.tone)}>{config.label}</span>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {config.hint}
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
                  {showActions && (
                    <td className="px-3 py-2 text-right">
                      {config.action && (
                        <Button
                          variant="secondary"
                          className="px-3! py-1! text-xs!"
                          onClick={() => onLinkOne(talla.id)}
                          disabled={isLinking || isRunning}
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
