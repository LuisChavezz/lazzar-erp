import type { CuentaPorPagarFormValues } from "../schemas/accounts-payable.schema";
import type { CreateCuentaPorPagarPayload } from "../interfaces/accounts-payable.interface";

/**
 * Convierte los valores del formulario al cuerpo exacto de
 * `POST /finanzas/cuentas-por-pagar/`.
 *
 * Traducciones del formulario → contrato del API:
 *  - `proveedor`, `factura_proveedor` y `total` viajan tal cual: los sembró la
 *    factura elegida (`valuesFromFacturaProveedor`). `total` NO se renormaliza
 *    con `Number(...).toFixed(2)`: ya es el decimal del API y pasarlo por un
 *    flotante solo podría alterarlo.
 *  - `fecha_vencimiento` se OMITE cuando queda vacía: el backend copia entonces
 *    la de la factura. Mandar `null` tendría el mismo efecto en el servidor,
 *    pero diría "sin vencimiento", que no es lo que pasa (ver
 *    `CreateCuentaPorPagarPayload`).
 *  - `observaciones` vacía viaja como `null` (el modelo la declara nullable;
 *    `""` guardaría una cadena en blanco que se lee como dato existente).
 *
 * Nunca incluye `saldo`/`estatus` (de solo lectura en el alta), `empresa`,
 * `fecha_emision`, ni los campos que el formulario arrastra solo para la vista
 * (`factura_proveedor_folio`, `proveedor_nombre`, `moneda_codigo`).
 */
export function buildCuentaPorPagarPayload(
  values: CuentaPorPagarFormValues,
): CreateCuentaPorPagarPayload {
  const observaciones = values.observaciones.trim();

  const payload: CreateCuentaPorPagarPayload = {
    proveedor: values.proveedor,
    factura_proveedor: values.factura_proveedor,
    total: values.total,
    observaciones: observaciones ? observaciones : null,
  };

  // Solo se añade la llave si hay fecha: ver la nota de `fecha_vencimiento` arriba.
  const fechaVencimiento = values.fecha_vencimiento.trim();
  if (fechaVencimiento.length > 0) {
    payload.fecha_vencimiento = fechaVencimiento;
  }

  return payload;
}
