import type {
  ReceiptCreatePayload,
  ReceiptCreateProductionOrderDetalle,
  ReceiptCreatePurchaseOrderDetalle,
  ReceiptCreateSalidaMaquilaDetalle,
  ReceiptOrderCandidate,
} from "../interfaces/receipt-onboarding.interface";
import type { ReceiptFormValues } from "../schemas/receipt.schema";
import { tieneCantidadRecibida } from "./receiptQuantities";

// Recorre el detalle de la orden y construye los renglones del payload,
// descartando los que no tengan una cantidad recibida positiva. El tipo de
// orden sólo afecta la forma del renglón (`buildRow`).
function reduceDetalle<D extends { id: number }, T>(
  detalle: D[],
  cantidades: ReceiptFormValues["cantidades"],
  buildRow: (item: D, cantidadRecibida: string) => T,
): T[] {
  return detalle.reduce<T[]>((acc, item) => {
    const cantidad = cantidades[String(item.id)];
    // Misma regla que el schema ("al menos una"): ver `tieneCantidadRecibida`.
    if (cantidad === undefined || !tieneCantidadRecibida(cantidad)) return acc;
    acc.push(buildRow(item, cantidad));
    return acc;
  }, []);
}

/**
 * Cuerpo del `POST /compras/recepciones/onboarding/` para el candidato elegido:
 *  - OC: `orden_compra` + renglones de la OC;
 *  - OP: `orden_produccion` + renglones de la OP, y `salida_maquila` si se
 *    recibe una SM de esa OP (el backend la cierra, EC-912);
 *  - SM de OB/OR: solo `salida_maquila` y cabecera, con `detalle: []`.
 * `fechaRecepcion` es un parámetro para que la función sea pura.
 */
export function buildReceiptPayload(
  candidate: ReceiptOrderCandidate,
  values: ReceiptFormValues,
  fechaRecepcion: string = new Date().toISOString(),
): ReceiptCreatePayload {
  // Campos de cabecera compartidos (idénticos para los tres flujos).
  const recepcionBase = {
    almacen: values.almacen,
    serie_codigo: values.serie_codigo,
    fecha_recepcion: fechaRecepcion,
    remision: values.remision,
    factura_referencia: values.factura_referencia,
    observaciones: values.observaciones,
    transportista: null,
  };
  // Solo cuando se pide: sin él, el backend deja la SM Enviada si falta algo.
  const cerrarSm = values.cerrar_salida_maquila ? { cerrar_salida_maquila: true } : {};

  switch (candidate.type) {
    case "compra":
      return {
        recepcion: { orden_compra: candidate.order.id, ...recepcionBase },
        detalle: reduceDetalle<
          (typeof candidate.order.detalle)[number],
          ReceiptCreatePurchaseOrderDetalle
        >(candidate.order.detalle, values.cantidades, (d, cantidad_recibida) => ({
          orden_compra_detalle: d.id,
          cantidad_recibida,
        })),
      };
    case "produccion":
      return {
        recepcion: {
          orden_produccion: candidate.order.id,
          ...(candidate.salidaMaquila ? { salida_maquila: candidate.salidaMaquila.id, ...cerrarSm } : {}),
          ...recepcionBase,
        },
        detalle: reduceDetalle<
          (typeof candidate.order.detalle)[number],
          ReceiptCreateProductionOrderDetalle
        >(candidate.order.detalle, values.cantidades, (d, cantidad_recibida) => ({
          orden_produccion_detalle: d.id,
          cantidad_recibida,
          producto_variante: d.producto_variante_id ?? null,
        })),
      };
    case "salida-maquila":
      // SM de OB/OR: cuenta piezas por renglón sin mover inventario (#1269).
      return {
        recepcion: { salida_maquila: candidate.salidaMaquila.id, ...cerrarSm, ...recepcionBase },
        detalle: reduceDetalle<{ id: number }, ReceiptCreateSalidaMaquilaDetalle>(
          candidate.salidaMaquila.detalle ?? [],
          values.cantidades,
          (d, cantidad_recibida) => ({ salida_maquila_detalle: d.id, cantidad_recibida }),
        ),
      };
  }
}
