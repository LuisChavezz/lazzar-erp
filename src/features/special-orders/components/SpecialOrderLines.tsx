"use client";

import type React from "react";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { EmbroideryLineLocationPopover } from "@/src/features/embroidery/components/EmbroideryLineLocationPopover";
import { ReflectiveLineConfigPopover } from "@/src/features/reflective-orders/components/ReflectiveLineConfigPopover";
import { bordadoUbicaciones, reflejanteEntries } from "@/src/features/orders/utils/tallaServiceConfigs";
import { cleanText } from "@/src/utils/cleanText";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";

/** Chip estático de servicio. Mismo estilo que el de `PedidoDetailContent`. */
function ServiceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
      {children}
    </span>
  );
}

/**
 * Servicios de UNA talla. Lo que aplica lo deciden SOLO las banderas `lleva_*`:
 * `bordado_config` llega como cascarón no nulo aunque `lleva_bordado` sea
 * `false`, así que la presencia de un config nunca activa un servicio.
 *
 * - Bordado y reflejante abren su popover de detalle cuando el config trae
 *   entradas; si no, queda el chip estático (mismo criterio que `PedidoLineas`).
 * - Corte de manga: solo el rótulo. Su `tipo` es un valor fijo sin significado
 *   conocido (`{ tipo: "1" }` en todos los datos) y no se muestra.
 * - Cambio de talla: solo el rótulo, con la redacción del detalle de pedido. Su
 *   config no tiene forma conocida y no se interpreta.
 */
function TallaServices({
  talla,
  line,
}: {
  talla: SpecialOrderTalla;
  line: SpecialOrderLine;
}) {
  const ubicaciones = talla.lleva_bordado ? bordadoUbicaciones(talla.bordado_config) : [];
  const reflejantes = talla.lleva_reflejante ? reflejanteEntries(talla.reflejante_config) : [];
  // `typeof` y no solo `cleanText`: el config es JSON libre y `notas` podría no
  // ser texto.
  const notas = talla.bordado_config?.notas;
  const notasBordado =
    talla.lleva_bordado && typeof notas === "string" ? cleanText(notas) : null;

  const chips: React.ReactNode[] = [];
  if (talla.lleva_bordado) {
    chips.push(
      ubicaciones.length > 0 ? (
        <EmbroideryLineLocationPopover
          key="bordado"
          ubicaciones={ubicaciones}
          productoNombre={line.producto_nombre_externo}
          tallaNombre={talla.talla_nombre}
          colorNombre={line.color_nombre}
          posicionLabel={null}
        />
      ) : (
        <ServiceChip key="bordado">Bordado</ServiceChip>
      ),
    );
  }
  if (talla.lleva_reflejante) {
    chips.push(
      reflejantes.length > 0 ? (
        <ReflectiveLineConfigPopover
          key="reflejante"
          configs={reflejantes}
          productoNombre={line.producto_nombre_externo}
          tallaNombre={talla.talla_nombre}
          colorNombre={line.color_nombre}
        />
      ) : (
        <ServiceChip key="reflejante">Reflejante</ServiceChip>
      ),
    );
  }
  if (talla.lleva_corte_manga) {
    chips.push(<ServiceChip key="corte">Corte de manga</ServiceChip>);
  }
  if (talla.lleva_cambio_talla) {
    chips.push(<ServiceChip key="cambio">Cambio talla</ServiceChip>);
  }

  if (chips.length === 0) {
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">{chips}</div>
      {notasBordado && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
          <span className="text-slate-400 dark:text-slate-500">Notas de bordado: </span>
          {notasBordado}
        </p>
      )}
    </div>
  );
}

/**
 * Piezas de la línea. Se descartan los valores no finitos (mismo criterio que
 * `sumarPiezas` en `CorteMangaOrderPageContent`).
 */
const totalPiezas = (tallas: SpecialOrderTalla[]): number =>
  tallas.reduce((acc, talla) => (Number.isFinite(talla.cantidad) ? acc + talla.cantidad : acc), 0);

/**
 * Líneas de muestra del pedido: una tarjeta por línea (producto externo +
 * color · total de piezas) con su tabla de tallas. Patrón de `PedidoLineas`,
 * sin precios ni picking — este contrato no los trae.
 */
export function SpecialOrderLines({ detalles }: { detalles: SpecialOrderLine[] }) {
  if (detalles.length === 0) {
    return <EmptyLines>Este pedido no tiene líneas de muestra.</EmptyLines>;
  }

  return (
    <div className="space-y-4">
      {detalles.map((line) => (
        <div
          key={line.id}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                {line.producto_nombre_externo || "—"}
              </span>
              {line.color_nombre && (
                <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                  {line.color_nombre}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                {formatQuantityValue(totalPiezas(line.tallas))} pzas
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {line.tallas.length} talla{line.tallas.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="p-3">
            {line.tallas.length === 0 ? (
              <EmptyLines>Esta línea no tiene tallas.</EmptyLines>
            ) : (
              <LineItemsTable
                head={
                  <>
                    <th className="px-3 py-2 font-semibold">Talla</th>
                    <th className="px-3 py-2 font-semibold">Servicios</th>
                    <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                  </>
                }
              >
                {line.tallas.map((talla) => (
                  <tr key={talla.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
                      {talla.talla_nombre || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <TallaServices talla={talla} line={line} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                      {formatQuantityValue(talla.cantidad)}
                    </td>
                  </tr>
                ))}
              </LineItemsTable>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
