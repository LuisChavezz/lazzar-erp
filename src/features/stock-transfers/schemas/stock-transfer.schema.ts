import { z } from "zod";

/**
 * Esquema del formulario de captura de traspasos almacén→almacén.
 *
 * Valida los VALORES DEL FORMULARIO (no el payload): cada línea guarda ambos
 * ids `producto`/`producto_variante` con `0` como centinela de "sin
 * seleccionar" (mismo criterio que el resto de selectores del proyecto) y un
 * discriminador `tipo_item` que decide cuál está activo. El mapeo al cuerpo del
 * API (con `null` en el campo inactivo) vive en `utils/buildTransferPayload.ts`.
 *
 * Reglas espejo de la validación del backend, para dar feedback inmediato:
 *  - `almacen_origen` ≠ `almacen_destino`.
 *  - cada línea envía `producto` XOR `producto_variante` (exactamente uno).
 *  - `cantidad` es un decimal (hasta 4 posiciones) mayor a 0.
 */

/**
 * Cantidad de inventario como string decimal de hasta 4 posiciones
 * (ej. `"10"`, `"10.5"`, `"10.0000"`). Sigue la convención de dinero/decimales
 * del proyecto (ver `MONEY_REGEX` en `register-pending-invoice.schema.ts`),
 * ampliada a 4 decimales porque el inventario se mueve en `.toFixed(4)`.
 */
export const QUANTITY_REGEX = /^\d+(\.\d{1,4})?$/;

const QUANTITY_MESSAGE = "Cantidad inválida (usa hasta 4 decimales)";

/** Discriminador de la línea: qué tipo de artículo se traslada. */
export const ITEM_KINDS = ["producto", "producto_variante"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/**
 * Fuente única de la regla "`producto` XOR `producto_variante`, según
 * `tipo_item`": dado el discriminador y los dos ids en bruto de una línea,
 * resuelve cuál id queda activo (el que corresponde a `tipo_item`) y cuál se
 * anula. La usan por igual la limpieza del `SegmentedControl` en
 * `StockTransferForm` (para decidir qué campo poner en `0` al cambiar de
 * tipo), `buildTransferPayload` (para decidir qué campo va en `null` en el
 * cuerpo de la API) y este mismo `superRefine` (para decidir a qué campo
 * atribuir el error cuando ambos ids llegan informados) — antes cada uno
 * reimplementaba el mismo ternario por separado.
 */
export function resolveItemSelection(
  tipoItem: ItemKind,
  producto: number,
  productoVariante: number,
): { producto: number | null; producto_variante: number | null } {
  return {
    producto: tipoItem === "producto" ? producto : null,
    producto_variante: tipoItem === "producto_variante" ? productoVariante : null,
  };
}

export const TransferLineFormSchema = z
  .object({
    // `tipo_item` decide cuál de los dos ids debe venir informado.
    tipo_item: z.enum(ITEM_KINDS),
    // `0` = sin seleccionar. La regla XOR de abajo exige exactamente uno > 0.
    producto: z.number().int().nonnegative(),
    producto_variante: z.number().int().nonnegative(),
    cantidad: z
      .string()
      .min(1, "La cantidad es requerida")
      .regex(QUANTITY_REGEX, QUANTITY_MESSAGE)
      .refine((v) => Number(v) > 0, "La cantidad debe ser mayor a 0"),
    // `0` = sin ubicación (opcional).
    ubicacion_origen: z.number().int().nonnegative(),
    ubicacion_destino: z.number().int().nonnegative(),
  })
  .superRefine((line, ctx) => {
    const hasProducto = line.producto > 0;
    const hasVariante = line.producto_variante > 0;

    // XOR: exactamente uno. El backend rechaza enviar ambos o ninguno.
    if (line.tipo_item === "producto" && !hasProducto) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un producto",
        path: ["producto"],
      });
    }
    if (line.tipo_item === "producto_variante" && !hasVariante) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una variante",
        path: ["producto_variante"],
      });
    }
    // Defensa en profundidad: la UI ya impide tener ambos, pero se valida el
    // XOR completo por si el estado llegara inconsistente.
    if (hasProducto && hasVariante) {
      const resolved = resolveItemSelection(
        line.tipo_item,
        line.producto,
        line.producto_variante,
      );
      // El campo inactivo (el que `tipo_item` anula) es el que recibe el error.
      const inactiveField = resolved.producto === null ? "producto" : "producto_variante";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Elige producto o variante, no ambos",
        path: [inactiveField],
      });
    }
  });

/**
 * Mensaje del rechazo origen == destino. Se comparte entre la validación en vivo
 * del formulario (al cambiar cualquiera de los dos almacenes) y el `superRefine`
 * de envío, para que ambos muestren exactamente el mismo texto sin desfasarse.
 */
export const SAME_WAREHOUSE_MESSAGE =
  "El almacén de destino debe ser distinto del de origen";

export const StockTransferFormSchema = z
  .object({
    almacen_origen: z.number().int().min(1, "El almacén de origen es requerido"),
    almacen_destino: z.number().int().min(1, "El almacén de destino es requerido"),
    observaciones: z.string(),
    transferencia_detalle: z
      .array(TransferLineFormSchema)
      .min(1, "Agrega al menos una línea de traspaso"),
  })
  .superRefine((data, ctx) => {
    // Pre-check cliente: el backend rechaza el traspaso si origen == destino.
    if (
      data.almacen_origen > 0 &&
      data.almacen_destino > 0 &&
      data.almacen_origen === data.almacen_destino
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: SAME_WAREHOUSE_MESSAGE,
        path: ["almacen_destino"],
      });
    }
  });

export type TransferLineFormValues = z.infer<typeof TransferLineFormSchema>;
export type StockTransferFormValues = z.infer<typeof StockTransferFormSchema>;

/** Línea vacía por defecto — un producto sin seleccionar, cantidad en blanco. */
export const createEmptyTransferLine = (): TransferLineFormValues => ({
  tipo_item: "producto",
  producto: 0,
  producto_variante: 0,
  cantidad: "",
  ubicacion_origen: 0,
  ubicacion_destino: 0,
});
