"use client";

import { TraspasosIcon, InfoIcon } from "@/src/components/Icons";
import { StockTransferForm } from "./StockTransferForm";

/**
 * Vista de Traspasos.
 *
 * El backend expone SOLO `create()` (`POST /wms/transferencias/`) — todavía no
 * hay `GET`/historial de traspasos, por lo que esta vista no renderiza tabla:
 * ofrece la captura y explica dónde consultar el resultado mientras llega el
 * endpoint de listado (tarea de seguimiento). El `MovimientoInventario` que
 * genera cada traspaso sí aparece en el historial general de movimientos.
 */
export function StockTransfersView() {
  return (
    <div className="space-y-6">
      {/* Encabezado + acción principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
            <TraspasosIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Traspasos entre almacenes
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Traslada existencias de un almacén de origen a uno de destino.
            </p>
          </div>
        </div>
        <StockTransferForm />
      </div>

      {/* Nota informativa: aún no hay historial propio de traspasos */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <InfoIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              El historial de traspasos estará disponible próximamente
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cada traspaso registrado genera un movimiento de inventario que
              puedes consultar en el historial general de movimientos. La vista
              de listado y detalle propia de traspasos se agregará cuando el
              backend habilite el endpoint de consulta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
