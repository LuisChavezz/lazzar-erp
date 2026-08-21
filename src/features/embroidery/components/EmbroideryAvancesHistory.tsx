"use client";

import { useState } from "react";
import {
  EmptyLines,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DeleteIcon, PlusIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { useDeleteAvance } from "../hooks/useDeleteAvance";
import { EmbroideryCreateAvanceDialog } from "./EmbroideryCreateAvanceDialog";
import { buildEmbroiderySkuLabel } from "../utils/embroiderySkuLabel";
import type {
  BordadoAvance,
  EmbroideryOrderDetailLine,
  ResumenAvancePorDetalle,
} from "../interfaces/embroidery.interface";

interface EmbroideryAvancesHistoryProps {
  avances: BordadoAvance[];
  obId: number;
  /** Estatus terminal (Finalizado/Cancelado): no se pueden registrar avances. */
  isTerminal: boolean;
  /** Renglones de la orden — se reenvían al selector del diálogo de alta. */
  detalles: EmbroideryOrderDetailLine[];
  /** Desglose por renglón — contexto "programado / bordado" del diálogo. */
  porDetalle: ResumenAvancePorDetalle[];
}

/**
 * Historial de avances de la orden + acciones de alta y baja.
 *
 * El estado de los diálogos (crear / confirmar borrado) vive AQUÍ, en el
 * componente de lista, nunca dentro de una celda: es una tabla estática, pero
 * se sigue el mismo criterio que el resto del proyecto. El borrado usa el
 * `ConfirmDialog` compartido controlado por `avanceToDelete`.
 */
export function EmbroideryAvancesHistory({
  avances,
  obId,
  isTerminal,
  detalles,
  porDetalle,
}: EmbroideryAvancesHistoryProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [avanceToDelete, setAvanceToDelete] = useState<BordadoAvance | null>(null);
  const { mutate: deleteAvance, isPending: isDeleting } = useDeleteAvance(obId);

  const registerButton = (
    <Button
      variant="primary"
      leftIcon={<PlusIcon className="w-4 h-4" aria-hidden="true" />}
      disabled={isTerminal}
      title={
        isTerminal
          ? "No se pueden registrar avances en una orden completada o cancelada"
          : undefined
      }
      onClick={() => setCreateOpen(true)}
    >
      Registrar avance
    </Button>
  );

  return (
    <Section title={`Historial de avances (${avances.length})`} action={registerButton}>
      {avances.length === 0 ? (
        <EmptyLines>Sin avances registrados.</EmptyLines>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-white/5">
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold">Talla / SKU</th>
                <th className="px-3 py-2 text-left font-semibold">Operador</th>
                <th className="px-3 py-2 text-right font-semibold">Piezas</th>
                {/* Dos columnas desde que el avance registra el ponchado: lo
                    que lleva UNA prenda y el producto por las piezas de la
                    tanda. Los avances anteriores a este seguimiento traen 0 en
                    ambas —su dato vive en `puntadas_realizadas`, el contador
                    manual, que ya no se pinta— y se muestran tal cual, sin
                    respaldo: mezclar las dos escalas en una columna daría
                    cifras incomparables entre filas. */}
                <th className="px-3 py-2 text-right font-semibold">Punt/pieza</th>
                <th className="px-3 py-2 text-right font-semibold">Punt total</th>
                <th className="px-3 py-2 text-left font-semibold">Comentario</th>
                <th className="px-3 py-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {avances.map((avance) => (
                <tr
                  key={avance.id}
                  className="border-t border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
                    {formatShortDate(avance.fecha)} · {formatShortTime(avance.fecha)}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {avance.orden_bordado_detalle_display ? (
                      <span
                        title={buildEmbroiderySkuLabel(
                          avance.orden_bordado_detalle_display,
                        )}
                      >
                        {avance.orden_bordado_detalle_display.talla_nombre ??
                          buildEmbroiderySkuLabel(
                            avance.orden_bordado_detalle_display,
                          )}
                      </span>
                    ) : (
                      <span className="italic text-slate-400 dark:text-slate-500">
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {textOrDash(avance.usuario_nombre)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {formatQuantityValue(avance.cantidad_bordada)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatQuantityValue(avance.puntadas_por_pieza)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatQuantityValue(avance.puntadas_total)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-xs">
                    {textOrDash(avance.comentario)}
                  </td>
                  {/* En un estatus terminal el icono NO se pinta (en vez de
                      salir atenuado): la orden está cerrada y borrar un avance
                      la dejaría por debajo del 100% sin forma de recomponerla
                      —el alta ya está bloqueada—. Se oculta, no se inhabilita,
                      para no ofrecer una acción que nunca va a proceder. */}
                  <td className="px-3 py-2 text-right">
                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => setAvanceToDelete(avance)}
                        disabled={isDeleting}
                        aria-label="Eliminar avance"
                        title="Eliminar avance"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <DeleteIcon className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmbroideryCreateAvanceDialog
        obId={obId}
        detalles={detalles}
        porDetalle={porDetalle}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <ConfirmDialog
        open={avanceToDelete !== null}
        onOpenChange={(next) => {
          if (!next) setAvanceToDelete(null);
        }}
        title="Eliminar avance"
        description="¿Eliminar este registro de avance? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        onConfirm={() => {
          // `avanceToDelete` está capturado del render con el diálogo abierto,
          // así que su id es válido aunque el cierre resetee el estado.
          if (avanceToDelete) deleteAvance(avanceToDelete.id);
          setAvanceToDelete(null);
        }}
      />
    </Section>
  );
}
