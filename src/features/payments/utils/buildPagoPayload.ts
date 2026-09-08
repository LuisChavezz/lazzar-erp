import {
  centavosAMoneda,
  sumImportesEnCentavos,
  type PagoFormValues,
} from "../schemas/payment.schema";
import type {
  CreatePagoDetallePayload,
  CreatePagoPayload,
} from "../interfaces/payment.interface";

/**
 * Convierte los valores del formulario al cuerpo exacto de
 * `POST /finanzas/pagos/`.
 *
 * Traducciones del formulario → contrato del API:
 *  - `total_pagado` se DERIVA de las líneas (suma en centavos enteros, luego a
 *    string de 2 decimales). No es un campo que el usuario capture: así el
 *    cuadre que el backend exige (`|suma − total| <= 0.01`) se cumple por
 *    construcción y no por una validación que pudiera desincronizarse.
 *  - `estatus` viaja SIEMPRE como `"Aplicado"`. Esta UI no expone `Borrador`, y
 *    se manda explícito en vez de confiar en el default del modelo.
 *  - `fecha_pago` se OMITE cuando el usuario la deja vacía. El campo NO es
 *    nullable (`DateField(default=timezone.localdate)` sin `null=True`), así que
 *    mandar `null` daría 400; omitir la llave deja que el backend aplique su
 *    default. Esto INVIERTE la convención `"" → null` del resto de finanzas — de
 *    ahí que sea el único campo opcional que se trata con `omitir` y no con
 *    `null`.
 *  - el resto de opcionales vacíos viajan como `null` (el backend los declara
 *    nullable; `""` guardaría una cadena basura que se lee como dato existente
 *    pero en blanco).
 *  - los importes de línea se normalizan a 2 decimales.
 *
 * Nunca incluye `empresa` ni `created_at`/`updated_at` (los resuelve el
 * backend), ni `activo` (el ciclo de vida lo lleva `estatus` + la acción
 * `/cancelar/`), ni el FK padre dentro de cada renglón (`pago` es de solo
 * lectura en el serializer), ni los campos que la línea arrastra solo para la
 * vista (`saldo`, `moneda_codigo`, `factura_folio`).
 */
export function buildPagoPayload(values: PagoFormValues): CreatePagoPayload {
  const optional = (raw: string, uppercase = false): string | null => {
    const trimmed = uppercase ? raw.trim().toUpperCase() : raw.trim();
    return trimmed ? trimmed : null;
  };

  const pago_detalles: CreatePagoDetallePayload[] = values.pago_detalles.map(
    (line) => ({
      cxp: line.cxp,
      importe_aplicado: Number(line.importe_aplicado).toFixed(2),
      observaciones: optional(line.observaciones),
    }),
  );

  const payload: CreatePagoPayload = {
    proveedor: values.proveedor,
    cuenta_bancaria: values.cuenta_bancaria,
    metodo_pago: values.metodo_pago,
    referencia: optional(values.referencia, true),
    referencia_operacion: optional(values.referencia_operacion, true),
    total_pagado: centavosAMoneda(sumImportesEnCentavos(values.pago_detalles)),
    estatus: "Aplicado",
    observaciones: optional(values.observaciones),
    pago_detalles,
  };

  // Solo se añade la llave si hay fecha: ver la nota de `fecha_pago` arriba.
  const fechaPago = values.fecha_pago.trim();
  if (fechaPago.length > 0) {
    payload.fecha_pago = fechaPago;
  }

  return payload;
}
