import { z } from "zod";
import type {
  InvoiceDesglose,
  InvoiceDesgloseApiResponse,
} from "../interfaces/invoice-desglose.interface";

/**
 * Validación de `GET /finanzas/facturas/{id}/desglose/`. El servicio valida
 * con este schema antes de entregar el dato, para que un cambio de contrato
 * falle como error de carga visible y no como `NaN` o "undefined" en pantalla.
 *
 * Los importes llegan como string decimal y salen como `number` (la conversión
 * es la normalización del servicio). Los textos que el backend toma de campos
 * opcionales del modelo se aceptan `null`.
 */
const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, "Decimal inválido");
const amount = decimalString.transform(Number);
const text = z.string().nullable();
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const estatusFactura = z.enum(["Borrador", "Emitida", "Cancelada"]);

const satKey = z
  .object({ codigo: z.string(), descripcion: text })
  .nullable();

const tallaSchema = z.object({
  factura_detalle: z.number().int(),
  pedido_detalle_talla: z.number().int().nullable(),
  talla: z.number().int().nullable(),
  talla_nombre: text,
  cantidad: z.number(),
  precio_unitario: amount,
  subtotal: amount,
  descuento: amount,
  porcentaje_impuesto: decimalString.nullable().transform((value) => (value === null ? null : Number(value))),
  impuesto: amount,
  total: amount,
  cantidad_pedida: z.number().nullable(),
  cantidad_pendiente_pedido: z.number().nullable(),
});

const conceptoSchema = z.object({
  pedido_detalle: z.number().int(),
  producto: z.object({
    id: z.number().int(),
    nombre: text,
    codigo: text,
    descripcion: text,
    unidad_medida: text,
    sat_clave_prodserv: satKey,
    sat_clave_unidad: satKey,
  }),
  color: z.object({ id: z.number().int(), nombre: text }).nullable(),
  cantidad: z.number(),
  subtotal: amount,
  descuento: amount,
  impuesto: amount,
  total: amount,
  tallas: z.array(tallaSchema),
});

export const invoiceDesgloseResponseSchema: z.ZodType<
  InvoiceDesglose,
  InvoiceDesgloseApiResponse
> = z.object({
  id: z.number().int(),
  folio: text,
  estatus: estatusFactura,
  fecha_emision: dateKey,
  fecha_vencimiento: dateKey.nullable(),
  observaciones: text,
  created_at: z.string(),
  emisor: z.object({
    empresa: z.number().int(),
    razon_social: text,
    nombre_comercial: text,
    rfc: text,
    sucursal: z.number().int(),
    sucursal_nombre: text,
  }),
  receptor: z.object({
    cliente: z.number().int(),
    nombre: text,
    razon_social: text,
    rfc: text,
    regimen_fiscal: satKey,
    codigo_postal: text,
    correo_facturas: text,
  }),
  pedido: z
    .object({
      id: z.number().int(),
      folio: text,
      oc: text,
      forma_pago: text,
      forma_pago_nombre: text,
      metodo_pago: text,
      metodo_pago_nombre: text,
      uso_cfdi: text,
      uso_cfdi_nombre: text,
    })
    .nullable(),
  moneda: z.object({
    id: z.number().int(),
    codigo_iso: z.string(),
    nombre: text,
    simbolo: text,
  }),
  conceptos: z.array(conceptoSchema),
  importes: z.object({
    total_piezas: z.number(),
    subtotal: amount,
    descuento: amount,
    impuestos: amount,
    total: amount,
  }),
  avance_pedido: z
    .object({
      piezas_pedidas: z.number(),
      piezas_facturadas: z.number(),
      piezas_pendientes: z.number(),
    })
    .nullable(),
  parcialidades: z.array(
    z.object({
      id: z.number().int(),
      folio: text,
      estatus: estatusFactura,
      fecha_emision: dateKey,
      total: amount,
      es_esta_factura: z.boolean(),
    }),
  ),
  cobranza: z.array(
    z.object({
      id: z.number().int(),
      estatus: z.string(),
      total: amount,
      saldo: amount,
      fecha_vencimiento: dateKey.nullable(),
      fecha_ultimo_pago: dateKey.nullable(),
    }),
  ),
  notas_credito: z.array(
    z.object({
      id: z.number().int(),
      folio: text,
      estatus: z.string(),
      motivo: text,
      fecha_emision: dateKey.nullable(),
      total: amount,
    }),
  ),
});
