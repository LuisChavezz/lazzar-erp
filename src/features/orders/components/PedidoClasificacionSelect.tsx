"use client";

import { InlineSelect } from "@/src/components/InlineSelect";
import {
  getPedidoClasificacionLabel,
  isPedidoClasificacion,
  PEDIDO_CLASIFICACION_CONFIG,
  PEDIDO_CLASIFICACIONES,
  type PedidoClasificacion,
} from "../constants/pedidoStatus";

/**
 * Valor de la opción "Sin clasificación". Cadena vacía porque `InlineSelect`
 * emite `string` y ningún código (`A`–`F`, `X`) puede colisionar con ella. Se
 * traduce a `null` antes de salir de aquí: el backend rechaza `""`.
 */
const NONE_VALUE = "";

interface PedidoClasificacionSelectProps {
  /** Código crudo del detalle (`clasificacion`). */
  value: string | null | undefined;
  onChange: (clasificacion: PedidoClasificacion | null) => void;
  isPending?: boolean;
}

/**
 * Selector inline de la clasificación del pedido, en la cabecera del detalle.
 *
 * El menú no ofrece la clasificación ACTUAL —elegirla mandaría un PATCH que no
 * cambia nada—, mismo criterio que `EmbroideryProveedorSelect`. "Sin
 * clasificación" va primero y desaparece cuando el pedido ya no tiene.
 */
export function PedidoClasificacionSelect({
  value,
  onChange,
  isPending = false,
}: PedidoClasificacionSelectProps) {
  const current = isPedidoClasificacion(value) ? value : null;

  const options = [
    ...(current === null ? [] : [{ value: NONE_VALUE, label: "Sin clasificación" }]),
    ...PEDIDO_CLASIFICACIONES.filter((codigo) => codigo !== current).map((codigo) => ({
      value: codigo,
      label: PEDIDO_CLASIFICACION_CONFIG[codigo].label,
    })),
  ];

  return (
    <InlineSelect
      options={options}
      onSelect={(next) => onChange(isPedidoClasificacion(next) ? next : null)}
      ariaLabel="Cambiar clasificación del pedido"
      isPending={isPending}
      triggerClassName="text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
    >
      {/* Un código fuera del catálogo se muestra tal cual (con su "Desconocida"),
          no como vacío: sigue guardado en el pedido. */}
      {value ? getPedidoClasificacionLabel(value) : "—"}
    </InlineSelect>
  );
}
