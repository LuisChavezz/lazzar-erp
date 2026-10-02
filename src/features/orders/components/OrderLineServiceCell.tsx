"use client";

import { Popover } from "@radix-ui/themes";
import type { PedidoDetalleLinea, PedidoDetalleTalla } from "../interfaces/order.interface";
import {
  lineProductName,
  summarizeLineService,
  type LineServiceFlag,
} from "../utils/orderLines";
import { TallaServiceChips } from "./TallaServiceChips";

/** Banderas `lleva_*` que `TallaServiceChips` pinta. */
const SERVICE_FLAGS: LineServiceFlag[] = [
  "lleva_bordado",
  "lleva_reflejante",
  "lleva_corte_manga",
  "lleva_cambio_talla",
];

/**
 * La talla con SOLO el servicio `flag` encendido. `TallaServiceChips` pinta un
 * chip por cada bandera `lleva_*` en `true`; apagando las demás, la celda de
 * Bordado muestra solo el bordado de cada talla (y así cada columna), sin tocar
 * el componente, que comparte el detalle de pedidos especiales.
 */
function withOnlyService(talla: PedidoDetalleTalla, flag: LineServiceFlag): PedidoDetalleTalla {
  const onlyFlag = Object.fromEntries(
    SERVICE_FLAGS.map((key) => [key, key === flag ? talla[key] : false]),
  ) as Pick<PedidoDetalleTalla, LineServiceFlag>;
  return { ...talla, ...onlyFlag };
}

interface OrderLineServiceCellProps {
  linea: PedidoDetalleLinea;
  flag: LineServiceFlag;
  /** Nombre del servicio en minúsculas, para el texto accesible ("bordado"). */
  serviceLabel: string;
}

/**
 * Celda de servicio de la tabla de productos: "No" en texto plano; "Sí" o
 * "Parcial" (cuando solo algunas tallas lo llevan) como disparador de un
 * popover de SOLO LECTURA con la configuración de ese servicio por talla, tal
 * como la pintaba la página anterior con `TallaServiceChips` (chips con su
 * propio popover de ubicaciones de bordado o de configuración de reflejante).
 * Nada de esto incluye importes.
 */
export function OrderLineServiceCell({ linea, flag, serviceLabel }: OrderLineServiceCellProps) {
  const summary = summarizeLineService(linea, flag);

  if (summary.kind === "none") {
    return <span className="text-xs text-slate-500 dark:text-slate-400">No</span>;
  }

  const productoNombre = lineProductName(linea);
  const tallas = linea.tallas.filter((talla) => talla[flag]);
  const isPartial = summary.kind === "partial";
  const sizes = tallas.map((talla) => talla.talla_nombre).join(", ");

  return (
    <Popover.Root>
      <Popover.Trigger>
        <button
          type="button"
          className={`cursor-pointer rounded text-xs font-medium underline decoration-dotted underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${
            isPartial
              ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              : "text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          }`}
          aria-label={
            isPartial
              ? `Parcial: ver ${serviceLabel} de las tallas ${sizes}`
              : `Ver ${serviceLabel} por talla`
          }
        >
          {isPartial ? "Parcial" : "Sí"}
        </button>
      </Popover.Trigger>
      <Popover.Content size="1" maxWidth="360px" className="p-3!">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {serviceLabel}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          {productoNombre}
          {linea.color_nombre ? ` · ${linea.color_nombre}` : ""}
        </p>
        {isPartial && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
            Solo estas tallas lo llevan: {sizes}.
          </p>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {tallas.map((talla) => (
            <li key={talla.id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {talla.talla_nombre}
              </span>
              <TallaServiceChips
                talla={withOnlyService(talla, flag)}
                productoNombre={productoNombre}
                colorNombre={linea.color_nombre}
              />
            </li>
          ))}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
}
