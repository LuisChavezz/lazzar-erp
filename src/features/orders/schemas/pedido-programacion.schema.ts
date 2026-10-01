/**
 * Validación del formulario "Programar pedido". Réplica de las reglas de
 * `PedidoProgramarSerializer` para dar el aviso antes de enviar; el 400 del
 * backend sigue siendo la fuente de verdad.
 */
import { z } from "zod";
import {
  getDestinoNoAplicable,
  getDestinoNoAplicableMessage,
  PEDIDO_PROGRAMACION_DESTINOS,
  type PedidoProgramacionDestino,
} from "../constants/pedidoProgramacion";
import type { PedidoDetail } from "../interfaces/order.interface";
import { getProgramacionesValidas } from "../utils/pedidoProgramacion";

/**
 * Valores CRUDOS del formulario. `destino` es `""` mientras no se elige (la
 * opción "Seleccionar..." del select) y `cantidad` es el texto del input: la
 * conversión a código/entero la hace el schema, no el `onChange`.
 */
export interface PedidoProgramacionRowFormValues {
  destino: string;
  cantidad: string;
  comentarios: string;
}

/** Tope de `comentarios` por entrada, igual que el serializer. */
export const PEDIDO_PROGRAMACION_COMENTARIOS_MAX = 500;

/**
 * Longitud en CODE POINTS, como el `max_length` del serializer (el `len()` de
 * Python), no en unidades UTF-16 (`String.length`), que cuenta doble cada
 * emoji o carácter astral y rechazaría comentarios que el backend acepta.
 */
export const countCodePoints = (text: string): number => [...text].length;

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
  // Recortado: un comentario de solo espacios cuenta como vacío (→ `null`).
  comentarios: z
    .string()
    .trim()
    .refine(
      (value) => countCodePoints(value) <= PEDIDO_PROGRAMACION_COMENTARIOS_MAX,
      `Máximo ${PEDIDO_PROGRAMACION_COMENTARIOS_MAX} caracteres`,
    )
    .transform((value) => (value === "" ? null : value)),
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
 * Schema de la lista completa. Depende del pedido (el techo de piezas y sus
 * `destinos_aplicables`), igual que el serializer los recibe en su contexto.
 */
export const createPedidoProgramacionSchema = (
  totalPiezas: number,
  destinosAplicables: readonly PedidoProgramacionDestino[],
) =>
  z
    .object({ programaciones: z.array(pedidoProgramacionRowSchema) })
    .superRefine((data, ctx) => {
      // Guarda al enviar. En la UI el botón ya queda deshabilitado con la MISMA
      // regla (`getDestinoNoAplicable`, marca en vivo del hook); esto cubre
      // cualquier envío que no pase por ese botón.
      data.programaciones.forEach((row, index) => {
        const noAplicable = getDestinoNoAplicable(row.destino, destinosAplicables);
        if (noAplicable) {
          ctx.addIssue({
            code: "custom",
            path: ["programaciones", index, "destino"],
            message: getDestinoNoAplicableMessage(noAplicable),
          });
        }
      });

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
 *
 * Un elemento que no es objeto (`null`/primitivo/arreglo en el `JSONField`) sí
 * se descarta, y `comentarios` ausente o `null` llega como `""`: ambas reglas
 * viven en `getProgramacionesValidas`, compartida con la tabla "Pedidos
 * programados" para que el diálogo y la tabla cuenten los mismos renglones.
 */
export const createPedidoProgramacionFormValues = (
  pedido: PedidoDetail,
): PedidoProgramacionFormValues => ({
  programaciones: getProgramacionesValidas(pedido.programacion_conf).map((programacion) => ({
    destino: typeof programacion.destino === "string" ? programacion.destino : "",
    cantidad: String(programacion.cantidad ?? ""),
    comentarios: programacion.comentarios,
  })),
});
