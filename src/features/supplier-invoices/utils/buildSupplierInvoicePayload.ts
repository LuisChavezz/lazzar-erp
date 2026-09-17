import {
  calcularImportesLinea,
  calcularTotales,
  centavosAMoneda,
  qtyToUnits,
  type SupplierInvoiceEditFormValues,
  type SupplierInvoiceFormValues,
} from "../schemas/supplier-invoice.schema";
import type {
  CreateFacturaProveedorDetallePayload,
  CreateFacturaProveedorPayload,
  UpdateFacturaProveedorPayload,
} from "../interfaces/supplier-invoice.interface";

/** Opcional de texto: vacío → `null` (el backend lo declara nullable). */
const optional = (raw: string, uppercase = false): string | null => {
  const trimmed = uppercase ? raw.trim().toUpperCase() : raw.trim();
  return trimmed ? trimmed : null;
};

/**
 * Convierte los valores del formulario (YA VALIDADOS por
 * `SupplierInvoiceFormSchema`) al cuerpo exacto de
 * `POST /finanzas/facturas-proveedor/`.
 *
 * Traducciones del formulario → contrato del API:
 *  - los importes de CABECERA (`subtotal`, `descuento`, `impuestos`, `total`) se
 *    DERIVAN de los renglones con `calcularTotales`, la misma función que pinta
 *    el resumen en vivo. El backend no los valida contra nada y la CxP copia el
 *    `total` al registrar, así que tienen que ser la suma exacta de lo facturado.
 *  - los importes de cada RENGLÓN (`subtotal`, `impuesto`, `total`) se derivan con
 *    `calcularImportesLinea` a partir de cantidad, precio, descuento y la tasa de
 *    IVA de cabecera.
 *  - `cantidad` viaja con 2 decimales: el esquema ya bloqueó cualquier cantidad
 *    con decimales significativos más allá del segundo, así que `toFixed(2)` aquí
 *    no redondea nada — solo da forma canónica.
 *  - `estatus` es el `estatus_objetivo` del botón: `"Registrada"` registra en el
 *    mismo POST (el backend genera la CxP dentro de la misma transacción).
 *  - `fecha_vencimiento` vacía viaja como `null`; `folio` en mayúsculas.
 *
 * Nunca incluye `empresa` (la resuelve el servidor), `fecha_emision`
 * (`auto_now_add`), `created_at`/`updated_at`, `activo`, los calculados
 * (`proveedor_nombre`, `moneda_codigo`), el FK padre de cada renglón, ni los
 * campos que el formulario arrastra solo para la vista o para validar
 * (`oc_folio`, `recepcion_folio`, `tasa_iva`, `producto_nombre`,
 * `cantidad_recibida`, `cantidad_facturada_previa`, `precio_oc_oculto`).
 *
 * Lanza si algún importe no se puede calcular: con valores ya validados eso es
 * un error de programación, y mandar `NaN` al API sería peor que fallar aquí.
 */
export function buildSupplierInvoicePayload(
  values: SupplierInvoiceFormValues,
): CreateFacturaProveedorPayload {
  const factura_proveedor_detalles: CreateFacturaProveedorDetallePayload[] =
    values.factura_proveedor_detalles.map((line) => {
      const importes = calcularImportesLinea(line, values.tasa_iva);
      const cantidadUnits = qtyToUnits(line.cantidad);
      if (!importes || cantidadUnits === null) {
        throw new Error("buildSupplierInvoicePayload: renglón sin validar");
      }
      return {
        oc_detalle: line.oc_detalle,
        recepcion_detalle: line.recepcion_detalle,
        producto: line.producto,
        cantidad: (cantidadUnits / 10000).toFixed(2),
        precio_unitario: Number(line.precio_unitario).toFixed(2),
        descuento: centavosAMoneda(importes.descuentoCents),
        impuesto: centavosAMoneda(importes.impuestoCents),
        subtotal: centavosAMoneda(importes.subtotalCents),
        total: centavosAMoneda(importes.totalCents),
      };
    });

  const totales = calcularTotales(values.factura_proveedor_detalles, values.tasa_iva);
  if (!totales.completo) {
    throw new Error("buildSupplierInvoicePayload: totales incompletos");
  }

  return {
    sucursal: values.sucursal,
    proveedor: values.proveedor,
    oc: values.oc,
    recepcion: values.recepcion,
    moneda: values.moneda,
    fecha_vencimiento: optional(values.fecha_vencimiento),
    folio: optional(values.folio, true),
    subtotal: centavosAMoneda(totales.subtotalCents),
    descuento: centavosAMoneda(totales.descuentoCents),
    impuestos: centavosAMoneda(totales.impuestosCents),
    total: centavosAMoneda(totales.totalCents),
    estatus: values.estatus_objetivo,
    observaciones: optional(values.observaciones),
    factura_proveedor_detalles,
  };
}

/**
 * Cuerpo del PATCH de edición de CABECERA de un borrador.
 *
 * Solo `folio`, `fecha_vencimiento` y `observaciones`, más `estatus` ÚNICAMENTE
 * cuando la intención es registrar. "Guardar cambios" es una edición de cabecera
 * y no escribe estatus: mandar `"Borrador"` sugeriría que el cliente decide ese
 * valor, y contra una foto vieja de una factura que ya cambió de estatus sería un
 * intento de regresarla. NUNCA renglones (el PATCH los ignoraría: escritura solo
 * en el alta) ni importes (se derivan de los renglones, que ya no cambian).
 */
export function buildSupplierInvoiceUpdatePayload(
  values: SupplierInvoiceEditFormValues,
): UpdateFacturaProveedorPayload {
  return {
    folio: optional(values.folio, true),
    fecha_vencimiento: optional(values.fecha_vencimiento),
    observaciones: optional(values.observaciones),
    ...(values.estatus_objetivo === "Registrada" ? { estatus: "Registrada" as const } : {}),
  };
}
