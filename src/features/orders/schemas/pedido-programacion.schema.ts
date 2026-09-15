/**
 * Validación del formulario "Programar pedido". Réplica de las reglas de
 * `PedidoProgramarSerializer` para dar el aviso antes de enviar; el 400 del
 * backend sigue siendo la fuente de verdad.
 */
import { z } from "zod";
import { PEDIDO_PROGRAMACION_DESTINOS } from "../constants/pedidoProgramacion";
import type { PedidoDetail } from "../interfaces/order.interface";

/**
 * Valores CRUDOS del formulario. `destino` es `""` mientras no se elige (la
 * opción "Seleccionar..." del select) y `cantidad` es el texto del input: la
 * conversión a código/entero la hace el schema, no el `onChange`.
 */
export interface PedidoProgramacionRowFormValues {
  destino: string;
  cantidad: string;
}

export interface PedidoProgramacionFormValues {
  programaciones: PedidoProgramacionRowFormValues[];
}

const pedidoProgramacionRowSchema = z.object({
  destino: z.enum(PEDIDO_PROGRAMACION_DESTINOS, { message: "Selecciona un destino válido" }),
  cantidad: z
    .string()
    .trim()
    .regex(/^\d+$/, "Captura una cantidad entera")
    .transform(Number)
    .pipe(z.number().int().min(1, "La cantidad debe ser al menos 1")),
});

/**
 * Suma de piezas del pedido: `detalles[].cantidad_total`, que el backend
 * calcula como la suma de las cantidades de las tallas de la línea
 * (`PedidoDetalleReadSerializer.get_cantidad_total`). Sumado sobre todas las
 * líneas es el mismo agregado con el que `programar` valida
 * (`PedidoDetalleTalla.cantidad`). NO se usa `tracker_picking.total_prendas_pedido`.
 */
export const getPedidoTotalPiezas = (pedido: PedidoDetail): number =>
  (pedido.detalles ?? []).reduce((sum, linea) => sum + (Number(linea.cantidad_total) || 0), 0);

/** Cantidad capturada como entero, o `0` si el texto aún no es un entero. */
export const parseProgramacionCantidad = (cantidad: string): number =>
  /^\d+$/.test(cantidad.trim()) ? Number(cantidad.trim()) : 0;

export const sumProgramacionCantidades = (rows: PedidoProgramacionRowFormValues[]): number =>
  rows.reduce((sum, row) => sum + parseProgramacionCantidad(row.cantidad), 0);

/**
 * Schema de la lista completa. Depende del pedido (el techo de piezas), igual
 * que el serializer recibe `total_piezas` en su contexto.
 */
export const createPedidoProgramacionSchema = (totalPiezas: number) =>
  z
    .object({ programaciones: z.array(pedidoProgramacionRowSchema) })
    .superRefine((data, ctx) => {
      const suma = data.programaciones.reduce((sum, row) => sum + row.cantidad, 0);
      if (suma > totalPiezas) {
        ctx.addIssue({
          code: "custom",
          path: ["programaciones"],
          message: `La suma de cantidades programadas (${suma}) excede el total de piezas del pedido (${totalPiezas}).`,
        });
      }
    });

/**
 * Valores iniciales desde la programación GUARDADA: el usuario edita la lista
 * vigente, no una en blanco, porque el guardado la reemplaza entera.
 *
 * Un destino fuera de la lista blanca se precarga tal cual —no se descarta en
 * silencio—: el select no lo puede mostrar y el schema lo marca, así que el
 * usuario decide si lo cambia o lo quita antes de guardar.
 */
export const createPedidoProgramacionFormValues = (
  pedido: PedidoDetail,
): PedidoProgramacionFormValues => {
  const programaciones = pedido.programacion_conf?.programaciones;
  return {
    programaciones: Array.isArray(programaciones)
      ? programaciones.map((programacion) => ({
          destino: typeof programacion.destino === "string" ? programacion.destino : "",
          cantidad: String(programacion.cantidad ?? ""),
        }))
      : [],
  };
};
