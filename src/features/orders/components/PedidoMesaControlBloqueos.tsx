"use client";

import { ExclamationTriangleIcon } from "@/src/components/Icons";
import {
  bloqueoTieneDocumento,
  type PedidoMesaControlContexto,
} from "../interfaces/pedido-mesa-control-contexto.interface";

/**
 * Documentos ligados que impiden editar el pedido.
 *
 * Se usa en los DOS momentos en que el backend puede decir que no, porque los
 * dos devuelven exactamente el mismo cuerpo: el precheck al abrir la pantalla
 * (`GET …/editar-mesa-control-contexto/`) y el 409 del guardado, cuando el
 * bloqueo aparece mientras se editaba.
 */

/** Etiqueta en español para cada `tipo`. Cubre los 15 valores del backend. */
const ETIQUETA_BLOQUEO: Record<string, string> = {
  factura_emitida: "Factura emitida",
  orden_bordado_activa: "Orden de bordado activa",
  orden_reflejante_activa: "Orden de reflejante activa",
  orden_corte_manga_activa: "Orden de corte de manga activa",
  orden_produccion_activa: "Orden de producción activa",
  picking_activo: "Picking activo",
  factura_detalle_ligado: "Renglones de factura ligados",
  nota_credito_ligada: "Nota de crédito ligada",
  orden_bordado_detalle_ligado: "Renglones de bordado ligados",
  orden_reflejante_detalle_ligado: "Renglones de reflejante ligados",
  orden_corte_manga_detalle_ligado: "Renglones de corte de manga ligados",
  orden_produccion_detalle_ligado: "Renglones de producción ligados",
  picking_detalle_ligado: "Renglones de picking ligados",
  reserva_inventario_activa: "Reservas de inventario activas",
  reserva_talla_activa: "Reservas por talla activas",
};

const etiqueta = (tipo: string) => ETIQUETA_BLOQUEO[tipo] ?? tipo;

interface PedidoMesaControlBloqueosProps {
  contexto: PedidoMesaControlContexto;
  /** Enlaces de salida (detalle del pedido, listado). */
  children?: React.ReactNode;
}

export function PedidoMesaControlBloqueos({
  contexto,
  children,
}: PedidoMesaControlBloqueosProps) {
  return (
    <div className="w-full pt-2">
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-6 py-10"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <ExclamationTriangleIcon className="w-5 h-5" aria-hidden="true" />
          Este pedido no se puede editar todavía
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl text-center">
          {contexto.mensaje}
        </p>

        <ul className="w-full max-w-xl space-y-2">
          {contexto.bloqueos.map((bloqueo, index) => (
            <li
              // Las entradas de nivel renglón no traen `id`, y puede haber
              // varias del mismo `tipo` (dos facturas, tres pickings), así que la
              // llave combina ambas cosas con el índice como desempate.
              key={`${bloqueo.tipo}-${bloqueoTieneDocumento(bloqueo) ? bloqueo.id : index}`}
              className="rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-white dark:bg-white/5 px-4 py-3 text-left"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {etiqueta(bloqueo.tipo)}
                {bloqueoTieneDocumento(bloqueo) && (
                  <>
                    {" — "}
                    <span className="font-mono">{bloqueo.folio ?? `#${bloqueo.id}`}</span>
                    {/* `estatus` es string en factura y picking, pero ENTERO en
                        las órdenes de producción: se pinta con `String()` en vez
                        de asumir que ya es texto. */}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      {` (${String(bloqueo.estatus)})`}
                    </span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {bloqueo.accion_requerida}
              </p>
            </li>
          ))}
        </ul>

        {children && <div className="flex items-center gap-4">{children}</div>}
      </div>
    </div>
  );
}
