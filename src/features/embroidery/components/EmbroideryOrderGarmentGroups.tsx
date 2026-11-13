"use client";

import { WorkOrderGarmentGroups } from "@/src/components/WorkOrderGarmentGroups";
import type { EmbroideryOrderDetailLine } from "../interfaces/embroidery.interface";
import { resolveEmbroideryLineUbicaciones } from "../utils/resolveEmbroideryLineUbicaciones";
import { EmbroideryLineLocationPopover } from "./EmbroideryLineLocationPopover";

/** Detalle del bordado de una talla: posición + popover con las imágenes. */
const BordadoCell = ({ linea }: { linea: EmbroideryOrderDetailLine }) => {
  const ubicaciones = resolveEmbroideryLineUbicaciones(linea);
  if (ubicaciones.length === 0) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {linea.posicion_bordado ? `Posición: ${linea.posicion_bordado}` : "—"}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <EmbroideryLineLocationPopover
        ubicaciones={ubicaciones}
        productoNombre={linea.producto_nombre ?? `Producto #${linea.producto}`}
        tallaNombre={linea.talla_nombre}
        colorNombre={linea.color_nombre ?? null}
        posicionLabel={linea.posicion_bordado}
      />
      {ubicaciones.length > 1 && (
        <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
          {ubicaciones.length} bordados
        </span>
      )}
    </span>
  );
};

/** Prendas de la OB agrupadas por prenda + color (ver `WorkOrderGarmentGroups`). */
export function EmbroideryOrderGarmentGroups({ items }: { items: EmbroideryOrderDetailLine[] }) {
  return (
    <WorkOrderGarmentGroups
      items={items}
      toLine={(linea) => ({
        id: linea.id,
        productoId: linea.producto,
        producto: linea.producto_nombre ?? `Producto #${linea.producto}`,
        color: linea.color_nombre ?? null,
        talla: linea.talla_nombre,
        cantidad: linea.cantidad,
        sku: linea.sku,
        programado: linea.cantidad_asignada,
        pedido: linea.cantidad_pedido,
        pendiente: linea.cantidad_pendiente,
      })}
      columns={[{ key: "bordado", label: "Bordado", render: (linea) => <BordadoCell linea={linea} /> }]}
    />
  );
}
