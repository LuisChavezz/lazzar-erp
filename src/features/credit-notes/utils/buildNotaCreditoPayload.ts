import type { NotaCreditoFormValues } from "../schemas/credit-note.schema";
import type {
  CreateNotaCreditoDetallePayload,
  CreateNotaCreditoPayload,
} from "../interfaces/credit-note.interface";

/**
 * Convierte los valores del formulario al cuerpo exacto de
 * `POST /finanzas/notas-credito/`.
 *
 * Traducciones del formulario → contrato del API:
 *  - `total` viaja TAL CUAL LO CAPTURÓ EL USUARIO (normalizado a 2 decimales).
 *    NO se deriva de las líneas. Es la diferencia estructural con
 *    `buildPagoPayload`, donde `total_pagado` era la suma de los renglones: aquí
 *    el backend aplica `nota.total` a la cuenta por cobrar sin mirar el detalle,
 *    así que derivarlo cambiaría el importe acreditado por uno que el usuario no
 *    escribió.
 *  - `cliente` NO lo captura el usuario: lo siembra el selector desde la factura
 *    elegida. El backend valida que coincida con `factura.cliente`.
 *  - `estatus` viaja explícito (`Borrador` o `Emitida`) según el botón usado, en
 *    vez de confiar en el default del modelo.
 *  - los opcionales de texto vacíos viajan como `null` (el backend los declara
 *    nullable; `""` guardaría una cadena basura que se lee como dato existente
 *    pero en blanco).
 *  - todos los importes se normalizan a 2 decimales.
 *
 * Nunca incluye:
 *  - `empresa` — el modelo `NotaCredito` NO TIENE ese campo (el aislamiento va
 *    por `factura__empresa`); no es un caso de "lo resuelve el servidor".
 *  - `fecha_emision` — es `auto_now_add`, de solo lectura: la fija el backend al
 *    crear y mandarla no tendría efecto.
 *  - `created_at`/`updated_at` ni los campos calculados (`cliente_nombre`,
 *    `factura_folio`).
 *  - el FK padre dentro de cada renglón (`nota_credito` es de solo lectura en el
 *    serializer), ni los campos que la línea arrastra solo para la vista
 *    (`producto_nombre`, `cantidad_facturada`, `total_facturado`).
 */
export function buildNotaCreditoPayload(
  values: NotaCreditoFormValues,
): CreateNotaCreditoPayload {
  const optional = (raw: string, uppercase = false): string | null => {
    const trimmed = uppercase ? raw.trim().toUpperCase() : raw.trim();
    return trimmed ? trimmed : null;
  };

  const nota_credito_detalles: CreateNotaCreditoDetallePayload[] =
    values.nota_credito_detalles.map((line) => ({
      factura_detalle: line.factura_detalle,
      cantidad: Number(line.cantidad).toFixed(2),
      precio_unitario: Number(line.precio_unitario).toFixed(2),
      impuesto: Number(line.impuesto).toFixed(2),
      subtotal: Number(line.subtotal).toFixed(2),
      total: Number(line.total).toFixed(2),
    }));

  return {
    factura: values.factura,
    cliente: values.cliente,
    folio: optional(values.folio, true),
    motivo: optional(values.motivo),
    subtotal: Number(values.subtotal).toFixed(2),
    impuestos: Number(values.impuestos).toFixed(2),
    // Capturado, no derivado. Ver la nota de arriba.
    total: Number(values.total).toFixed(2),
    estatus: values.estatus,
    observaciones: optional(values.observaciones),
    nota_credito_detalles,
  };
}
