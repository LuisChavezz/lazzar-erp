import type {
  PurchaseOrderDetail,
  PurchaseOrderDetalle,
  PurchaseOrderReceipt,
} from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import type { ReceiptDetailLine } from "@/src/features/receipts/interfaces/receipt.interface";
import {
  importeACentavos,
  qtyToUnits,
  tieneMasDeDosDecimales,
  unitsToQty,
  type SupplierInvoiceLineFormValues,
} from "../schemas/supplier-invoice.schema";

/** Partida de recepción facturable, ya cruzada con su renglón de OC. */
export interface ReceptionLineOption {
  recepcionDetalle: ReceiptDetailLine;
  ocDetalle: PurchaseOrderDetalle;
  /** Diezmilésimas enteras. */
  recibidaUnits: number;
  /** Lo ya facturado en facturas no canceladas, en diezmilésimas. */
  facturadaUnits: number;
  /** `recibida − facturada`, nunca negativo. */
  disponibleUnits: number;
}

export interface ReceptionLineOptions {
  /** Partidas que todavía tienen cantidad por facturar. */
  disponibles: ReceptionLineOption[];
  /** Partidas vinculables pero ya facturadas por completo. */
  agotadas: number;
  /** Partidas que no se pudieron cruzar con la OC (ver `buildReceptionLineOptions`). */
  noVinculables: number;
}

/**
 * `Recepcion.estatus` (`compras.Recepcion.EstatusRecepcion`), solo los valores
 * que deciden si se factura. El resto —Recibida (2), Parcial (3), En calidad (4)
 * y Cerrada (5)— es mercancía recibida y SÍ se factura.
 */
const RECEPCION_ESTATUS = {
  BORRADOR: 1,
  CANCELADA: 6,
} as const;

export interface RecepcionesFacturables {
  /** Recepciones de origen `OC` que no están en borrador ni canceladas. */
  facturables: PurchaseOrderReceipt[];
  /**
   * Recepciones excluidas por ser de origen producción (`OP`): no están ligadas a
   * la orden de compra —sus partidas traen `orden_compra_detalle` nulo—, así que
   * no hay renglón de OC contra el cual facturarlas. Se cuentan para que el
   * selector lo diga, igual que el nivel de partidas cuenta las no vinculables.
   */
  excluidasPorOrigen: number;
  /**
   * Recepciones de origen `OC` excluidas por su `estatus`: en `Borrador` la
   * mercancía aún no se da por recibida, y una `Cancelada` ya no respalda nada
   * (el propio backend la descuenta de lo recibido). Facturarlas generaría una
   * cuenta por pagar por mercancía que no entró.
   */
  excluidasPorEstatus: number;
}

/**
 * Recepciones de la OC que se pueden facturar: de origen `OC` y ni en borrador ni
 * canceladas.
 *
 * El retrieve de la OC ya devuelve solo recepciones de origen OC y activas
 * (contrato confirmado), pero `ReceiptDetail` es un tipo compartido que modela
 * también el origen `OP`; se reafirma aquí para que la regla no dependa de que el
 * serializer siga filtrando. Ese retrieve NO filtra por `estatus`: una recepción
 * cancelada sigue `activo=True`. Las excluidas NO se ocultan en silencio: se
 * devuelven sus cuentas para que la vista explique por qué no aparecen.
 */
export const recepcionesFacturables = (oc: PurchaseOrderDetail): RecepcionesFacturables => {
  const deOrigenOc = oc.recepciones.filter((r) => r.tipo_origen === "OC");
  const facturables = deOrigenOc.filter(
    (r) => r.estatus !== RECEPCION_ESTATUS.BORRADOR && r.estatus !== RECEPCION_ESTATUS.CANCELADA,
  );
  return {
    facturables,
    excluidasPorOrigen: oc.recepciones.length - deOrigenOc.length,
    excluidasPorEstatus: deOrigenOc.length - facturables.length,
  };
};

/**
 * Motivos de exclusión de recepciones, en texto, para el subtítulo del selector
 * de recepciones. Vacío si no se excluyó ninguna.
 */
export const avisosRecepcionesExcluidas = ({
  excluidasPorOrigen,
  excluidasPorEstatus,
}: Pick<RecepcionesFacturables, "excluidasPorOrigen" | "excluidasPorEstatus">): string[] => {
  const avisos: string[] = [];
  if (excluidasPorOrigen > 0) {
    avisos.push(
      `${excluidasPorOrigen} ${excluidasPorOrigen === 1 ? "recepción se excluyó por ser" : "recepciones se excluyeron por ser"} de origen producción: no ${excluidasPorOrigen === 1 ? "está ligada" : "están ligadas"} a la orden de compra.`,
    );
  }
  if (excluidasPorEstatus > 0) {
    avisos.push(
      `${excluidasPorEstatus} ${excluidasPorEstatus === 1 ? "recepción se excluyó por estar en borrador o cancelada" : "recepciones se excluyeron por estar en borrador o canceladas"}: no hay mercancía recibida que facturar.`,
    );
  }
  return avisos;
};

/**
 * Cruza las partidas de UNA recepción con los renglones de su OC y descuenta lo
 * ya facturado.
 *
 * Una partida de recepción NO es vinculable —se excluye y se cuenta aparte— si:
 *  - `orden_compra_detalle` es `null` (partida de origen producción), o
 *  - su `orden_compra_detalle` no aparece en `oc.detalles`, o
 *  - su `producto` no coincide con el `producto_id` del renglón de OC.
 *
 * En los tres casos el backend rechazaría el alta completa (`perform_create`
 * valida que `oc_detalle` sea de la OC y que el producto coincida con ambos
 * detalles), y no hay forma honesta de elegir otro renglón de OC por el usuario.
 * Se cuentan en vez de ocultarse en silencio para que la vista explique por qué
 * una partida recibida no aparece.
 */
export const buildReceptionLineOptions = (
  oc: PurchaseOrderDetail,
  recepcion: PurchaseOrderReceipt,
  facturadoPorDetalle: Map<number, number>,
): ReceptionLineOptions => {
  const ocDetallesPorId = new Map(oc.detalles.map((detalle) => [detalle.id, detalle]));
  const result: ReceptionLineOptions = { disponibles: [], agotadas: 0, noVinculables: 0 };

  for (const recepcionDetalle of recepcion.detalles) {
    const ocDetalle =
      recepcionDetalle.orden_compra_detalle !== null
        ? ocDetallesPorId.get(recepcionDetalle.orden_compra_detalle)
        : undefined;
    if (!ocDetalle || ocDetalle.producto_id !== recepcionDetalle.producto) {
      result.noVinculables += 1;
      continue;
    }

    const recibidaUnits = qtyToUnits(recepcionDetalle.cantidad_recibida) ?? 0;
    const facturadaUnits = facturadoPorDetalle.get(recepcionDetalle.id) ?? 0;
    const disponibleUnits = Math.max(0, recibidaUnits - facturadaUnits);
    if (disponibleUnits <= 0) {
      result.agotadas += 1;
      continue;
    }

    result.disponibles.push({
      recepcionDetalle,
      ocDetalle,
      recibidaUnits,
      facturadaUnits,
      disponibleUnits,
    });
  }

  return result;
};

/**
 * ¿El descuento de este renglón de OC tiene que capturarse A MANO?
 *
 * ─── POR QUÉ NO SE PRORRATEA ─────────────────────────────────────────────────
 *
 * El backend guarda `descuento` como un importe PLANO del renglón de OC: nada lo
 * ata a la cantidad —no hay tasa, ni precio unitario de descuento, ni regla que
 * diga cómo se reparte—. Prorratearlo linealmente a la cantidad facturada
 * (`descuento × facturada / ordenada`) asume una proporcionalidad que el dato no
 * afirma: un descuento por volumen, por pronto pago o capturado a mano sobre el
 * total quedaría distorsionado, y recalcularlo cada vez que el usuario edita la
 * cantidad lo distorsionaría de nuevo en silencio. Así que no se reparte: se pide.
 *
 * Devuelve `true` —captura manual, con aviso— cuando:
 *  - el rol del usuario NO ve los financieros de la OC: el backend elimina
 *    `precio`, `descuento` e `importe` de la respuesta (las llaves no llegan, no
 *    vienen en `null`). Quien no puede ver el precio tampoco ve el descuento, así
 *    que asumir 0 sería inventarlo;
 *  - el descuento de la OC es DISTINTO DE CERO; o
 *  - el renglón NO cumple `importe == cantidad × precio − descuento`. Esa es la
 *    fórmula con la que la OC calcula su `importe` (`compras/api/views.py`); si no
 *    cuadra, el renglón fue editado por otra vía y ninguno de sus números es
 *    confiable para derivar un descuento.
 *
 * Devuelve `false` —el camino sin fricción— solo cuando los tres financieros
 * llegan, el descuento es 0 y la identidad cuadra.
 *
 * La comparación es EXACTA en centavos: `cantidad` de OC es entera y `precio`,
 * `descuento` e `importe` tienen 2 decimales, así que el producto no redondea.
 */
export const requiereDescuentoManual = (ocDetalle: PurchaseOrderDetalle): boolean => {
  // Financieros ocultos por rol: sin descuento visible no hay nada que aplicar.
  if (
    ocDetalle.precio === undefined ||
    ocDetalle.descuento === undefined ||
    ocDetalle.importe === undefined
  ) {
    return true;
  }
  const precio = importeACentavos(ocDetalle.precio);
  const descuento = importeACentavos(ocDetalle.descuento);
  const importe = importeACentavos(ocDetalle.importe);
  // Un financiero malformado tampoco es confiable.
  if (precio === null || descuento === null || importe === null) return true;
  if (descuento !== 0) return true;
  return ocDetalle.cantidad * precio - descuento !== importe;
};

/**
 * Siembra un renglón del formulario desde una partida elegida.
 *
 * - `cantidad` arranca en lo DISPONIBLE (lo recibido menos lo ya facturado): el
 *   caso normal es facturar lo que llegó. Si esa cantidad tiene decimales
 *   significativos más allá del segundo se siembra TAL CUAL ("10.125") en vez de
 *   redondearla: el esquema la bloquea con un mensaje y el usuario decide qué
 *   capturar. Si no, se siembra con 2 decimales ("10.1200" → "10.12").
 * - `precio_unitario` sale del renglón de OC. Si el rol del usuario no deja ver
 *   precios, la llave `precio` NO llega (no es `null`): el campo arranca vacío
 *   para captura manual y `precio_oc_oculto` lo marca.
 * - `descuento`: ver `requiereDescuentoManual`. Con descuento 0 en la OC (el
 *   único caso que produce hoy el API) arranca en "0.00" sin aviso. Si no, arranca
 *   VACÍO y marcado para captura manual — nunca se prorratea.
 */
export const lineFromReceptionOption = (
  option: ReceptionLineOption,
): SupplierInvoiceLineFormValues => {
  const { recepcionDetalle, ocDetalle, recibidaUnits, facturadaUnits, disponibleUnits } =
    option;

  const cantidad = tieneMasDeDosDecimales(disponibleUnits)
    ? unitsToQty(disponibleUnits)
    : (disponibleUnits / 10000).toFixed(2);

  const precioOculto = ocDetalle.precio === undefined;
  const descuentoManual = requiereDescuentoManual(ocDetalle);

  return {
    recepcion_detalle: recepcionDetalle.id,
    oc_detalle: ocDetalle.id,
    producto: recepcionDetalle.producto,
    producto_nombre: recepcionDetalle.producto_nombre || ocDetalle.producto_nombre,
    cantidad_recibida: unitsToQty(recibidaUnits),
    cantidad_facturada_previa: unitsToQty(facturadaUnits),
    precio_oc_oculto: precioOculto,
    cantidad,
    precio_unitario: precioOculto ? "" : (ocDetalle.precio ?? ""),
    descuento_manual_requerido: descuentoManual,
    descuento: descuentoManual ? "" : "0.00",
  };
};
