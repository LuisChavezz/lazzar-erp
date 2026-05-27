/**
 * Schema de validación estricta para el flujo "Enviar a revisión".
 *
 * Se apoya en la estructura del formulario (`quoteFormSchema`) y endurece
 * los campos que deben existir antes de pasar una cotización a revisión.
 */
import { z } from "zod";
import { type QuotePaymentCondition } from "../interfaces/quote.interface";
import { colorSelectionSchema } from "./color-selection.schema";
import { quoteItemSizeSchema } from "./quote-item-size.schema";
import { quoteItemSchema, quoteFormSchema } from "./quote.schema";

const PAYMENT_CONDITION_VALUES = [
  "100_anticipo",
  "50_anticipo",
  "vendedor_autoriza",
  "pago_antes_embarque",
  "por_confirmar",
  "otra_cantidad",
] as const satisfies readonly QuotePaymentCondition[];

const normalizeTextValue = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizePositiveNumberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const requiredText = (message: string) =>
  z.preprocess(
    normalizeTextValue,
    z.string().min(1, message)
  );

const requiredPositiveNumber = (message: string) =>
  z.preprocess(
    normalizePositiveNumberValue,
    z.number().min(1, message)
  );

const requiredEmail = (requiredMessage: string, invalidMessage: string) =>
  z.preprocess(
    normalizeTextValue,
    z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: requiredMessage,
        });
        return;
      }

      if (!z.string().email().safeParse(value).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: invalidMessage,
        });
      }
    })
  );

const requiredPaymentCondition = z.preprocess(
  normalizeTextValue,
  z.string().superRefine((value, ctx) => {
    if (!value || !PAYMENT_CONDITION_VALUES.includes(value as QuotePaymentCondition)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona una condición de pago",
      });
    }
  })
);

const quoteReviewReflectiveSpecSchema = z.object({
  opcion: requiredText("Selecciona una opción de reflejante"),
  posicion: requiredText("Selecciona una posición de reflejante"),
  tipo: requiredText("Selecciona un tipo de reflejante"),
});

const quoteReviewReflectiveSchema = z
  .object({
    activo: z.boolean(),
    observaciones: z.string().optional(),
    especificaciones: z.array(quoteReviewReflectiveSpecSchema),
  })
  .superRefine((data, ctx) => {
    if (!data.activo) {
      return;
    }

    if (data.especificaciones.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["especificaciones"],
        message: "Agrega al menos una especificación de reflejante",
      });
    }
  });

const quoteReviewItemSchema = quoteItemSchema.and(
  z.object({
    colorId: colorSelectionSchema.shape.colorId,
    tallas: z.array(quoteItemSizeSchema).min(1, "Agrega al menos una talla"),
    reflejantes: quoteReviewReflectiveSchema.optional(),
  })
);

// ─── Labels legibles para los campos validados ────────────────────────────────

export const QUOTE_REVIEW_FIELD_LABELS: Record<string, string> = {
  cliente: "Cliente",
  clienteNombre: "Nombre del cliente",
  razonSocial: "Razón social",
  rfc: "RFC",
  regimenFiscal: "Régimen fiscal",
  direccionFiscal: "Dirección fiscal",
  coloniaFiscal: "Colonia fiscal",
  codigoPostalFiscal: "Código postal fiscal",
  ciudadFiscal: "Ciudad fiscal",
  estadoFiscal: "Estado fiscal",
  persona_pagos: "Persona de pagos",
  correo_facturas: "Correo de facturas",
  telefono_pagos: "Teléfono de pagos",
  oc: "Orden de compra",
  forma_pago: "Forma de pago",
  metodo_pago: "Método de pago",
  uso_cfdi: "Uso de CFDI",
  condicionPago: "Condición de pago",
  condicionPagoMonto: "Monto de condición de pago",
  fecha: "Fecha",
  agente: "Agente",
  tipo_pedido: "Tipo de pedido",
  destinatario: "Destinatario",
  empresaEnvio: "Empresa de envío",
  telefonoEnvio: "Teléfono de envío",
  celularEnvio: "Celular de envío",
  direccionEnvio: "Dirección de envío",
  coloniaEnvio: "Colonia de envío",
  codigoPostalEnvio: "Código postal de envío",
  ciudadEnvio: "Ciudad de envío",
  estadoEnvio: "Estado de envío",
  referenciasEnvio: "Referencias de envío",
  comentarios_parcialidad: "Comentarios de parcialidad",
  moneda: "Moneda",
  iva: "IVA",
  items: "Productos",
  productoId: "Producto",
  colorId: "Color",
  tallas: "Tallas",
  tallaId: "Talla",
  cantidad: "Cantidad",
  bordados: "Bordados",
  reflejantes: "Reflejantes",
  ancho: "Ancho",
  alto: "Alto",
  posicionCodigo: "Ubicación",
  posicionPersonalizada: "Ubicación personalizada",
  colorHilo: "Color de hilo",
  opcion: "Opción",
  posicion: "Posición",
  tipo: "Tipo",
  lleva_corte_manga: "Corte de manga",
};

const quoteReviewBaseSchema = z.object({
  cliente: requiredPositiveNumber("Se requiere un cliente asociado"),
  rfc: requiredText("El RFC es requerido"),
  regimenFiscal: requiredText("El régimen fiscal es requerido"),
  direccionFiscal: requiredText("La dirección fiscal es requerida"),
  coloniaFiscal: requiredText("La colonia fiscal es requerida"),
  codigoPostalFiscal: requiredText("El código postal fiscal es requerido"),
  ciudadFiscal: requiredText("La ciudad fiscal es requerida"),
  estadoFiscal: requiredText("El estado fiscal es requerido"),
  persona_pagos: requiredText("La persona de pagos es requerida"),
  correo_facturas: requiredEmail(
    "El correo de facturas es requerido",
    "Correo inválido"
  ),
  telefono_pagos: requiredText("El teléfono de pagos es requerido"),
  oc: requiredText("La orden de compra es requerida"),
  forma_pago: requiredText("La forma de pago es requerida"),
  metodo_pago: requiredText("El método de pago es requerido"),
  uso_cfdi: requiredText("El uso de CFDI es requerido"),
  condicionPago: requiredPaymentCondition,
  fecha: requiredText("La fecha es requerida"),
  agente: requiredText("El agente es requerido"),
  tipo_pedido: requiredPositiveNumber("Selecciona un tipo de pedido"),
  destinatario: requiredText("El destinatario es requerido"),
  empresaEnvio: requiredText("La empresa de envío es requerida"),
  telefonoEnvio: requiredText("El teléfono de envío es requerido"),
  direccionEnvio: requiredText("La dirección de envío es requerida"),
  coloniaEnvio: requiredText("La colonia de envío es requerida"),
  codigoPostalEnvio: requiredText("El código postal de envío es requerido"),
  ciudadEnvio: requiredText("La ciudad de envío es requerida"),
  estadoEnvio: requiredText("El estado de envío es requerido"),
  moneda: requiredPositiveNumber("Se requiere seleccionar una moneda"),
  items: z
    .array(quoteReviewItemSchema)
    .min(1, "La cotización debe tener al menos un producto"),
});

// ─── Schema estricto de revisión ──────────────────────────────────────────────

export const quoteReviewSchema = quoteFormSchema
  .and(quoteReviewBaseSchema)
  .superRefine((data, ctx) => {
    if (!normalizeTextValue(data.clienteNombre) && !normalizeTextValue(data.razonSocial)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clienteNombre"],
        message: "El nombre o razón social del cliente es requerido",
      });
    }
  });

export type QuoteReviewInput = z.input<typeof quoteReviewSchema>;
export type QuoteReviewValues = z.output<typeof quoteReviewSchema>;
