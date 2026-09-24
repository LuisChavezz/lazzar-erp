"use client";

import type React from "react";
import { EmbroideryLineLocationPopover } from "@/src/features/embroidery/components/EmbroideryLineLocationPopover";
import { ReflectiveLineConfigPopover } from "@/src/features/reflective-orders/components/ReflectiveLineConfigPopover";
import type { PedidoDetalleTalla } from "../interfaces/order.interface";
import { bordadoUbicaciones, reflejanteEntries } from "../utils/tallaServiceConfigs";

/** Chip estático de servicio (corte manga / cambio talla, o bordado/reflejante
 *  cuando su config viene vacío y no hay popover que abrir). */
function ServiceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
      {children}
    </span>
  );
}

/**
 * Los campos de la talla que deciden y detallan sus servicios. Se toman de
 * `PedidoDetalleTalla` con `Pick` para que cualquier contrato con esos mismos
 * campos —el detalle 360° y el de pedidos especiales— lo satisfaga.
 */
type TallaServiceFields = Pick<
  PedidoDetalleTalla,
  | "talla_nombre"
  | "lleva_bordado"
  | "bordado_config"
  | "lleva_reflejante"
  | "reflejante_config"
  | "lleva_corte_manga"
  | "lleva_cambio_talla"
>;

interface TallaServiceChipsProps {
  talla: TallaServiceFields;
  /** Nombre del producto — para el nombre accesible de los popovers. */
  productoNombre: string;
  colorNombre: string | null;
}

/**
 * Servicios de UNA talla, como chips. Lo compartido entre el detalle 360° del
 * pedido (`PedidoLineas`) y el de pedidos especiales de Producción.
 *
 * Lo que aplica lo deciden SOLO las banderas `lleva_*`: `bordado_config` llega
 * como cascarón no nulo aunque `lleva_bordado` sea `false`. Bordado y
 * reflejante se envuelven en su popover de detalle cuando traen config; si el
 * config viene vacío (o para corte manga / cambio talla, que no se detallan),
 * queda un chip estático. Sin ningún servicio, el guion largo.
 */
export function TallaServiceChips({ talla, productoNombre, colorNombre }: TallaServiceChipsProps) {
  const ubicaciones = talla.lleva_bordado ? bordadoUbicaciones(talla.bordado_config) : [];
  const reflejantes = talla.lleva_reflejante ? reflejanteEntries(talla.reflejante_config) : [];
  const servicioChips: React.ReactNode[] = [];
  if (talla.lleva_bordado) {
    servicioChips.push(
      ubicaciones.length > 0 ? (
        <EmbroideryLineLocationPopover
          key="bordado"
          ubicaciones={ubicaciones}
          productoNombre={productoNombre}
          tallaNombre={talla.talla_nombre}
          colorNombre={colorNombre}
          posicionLabel={null}
        />
      ) : (
        <ServiceChip key="bordado">Bordado</ServiceChip>
      ),
    );
  }
  if (talla.lleva_reflejante) {
    servicioChips.push(
      reflejantes.length > 0 ? (
        <ReflectiveLineConfigPopover
          key="reflejante"
          configs={reflejantes}
          productoNombre={productoNombre}
          tallaNombre={talla.talla_nombre}
          colorNombre={colorNombre}
        />
      ) : (
        <ServiceChip key="reflejante">Reflejante</ServiceChip>
      ),
    );
  }
  if (talla.lleva_corte_manga) {
    servicioChips.push(<ServiceChip key="corte">Corte manga</ServiceChip>);
  }
  if (talla.lleva_cambio_talla) {
    servicioChips.push(<ServiceChip key="cambio">Cambio talla</ServiceChip>);
  }

  if (servicioChips.length === 0) {
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  }
  return <div className="flex flex-wrap items-center gap-1">{servicioChips}</div>;
}
