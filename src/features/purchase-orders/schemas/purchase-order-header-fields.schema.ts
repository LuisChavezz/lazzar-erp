import { z } from "zod";
import {
  DEFAULT_TIPO_COMPRA,
  TIPO_COMPRA_VALUES,
} from "../constants/purchaseOrderTipoCompra";

/**
 * Campos del encabezado de la orden que comparten el alta (anidado bajo
 * `orden_compra`) y la edición (plano). Viven aparte para que ambos schemas
 * apliquen exactamente las mismas reglas que el backend.
 */

/** Tope del backend (`OrdenCompra.referencia`, `max_length=50`). */
export const REFERENCIA_MAX_LENGTH = 50;

/**
 * Opcional: vacía viaja como `""` y el backend la guarda como `null`. Solo se
 * limita el largo, para que el error salga bajo el campo y no como un 400.
 */
export const referenciaSchema = z
  .string()
  .max(
    REFERENCIA_MAX_LENGTH,
    `La referencia no puede tener más de ${REFERENCIA_MAX_LENGTH} caracteres`,
  )
  .default("");

export const tipoCompraSchema = z
  .enum(TIPO_COMPRA_VALUES, { message: "Selecciona un tipo de compra válido" })
  .default(DEFAULT_TIPO_COMPRA);

/**
 * Pedidos de venta ligados (`[]` = ninguno). Reemplaza la lista completa en el
 * backend; el campo legado `pedido` no se usa.
 */
export const pedidosSchema = z.array(z.number().int().positive()).default([]);
