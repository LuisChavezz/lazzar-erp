/**
 * Schemas principales del formulario de cotización.
 * - `quoteItemSchema` está separado en su propio módulo y se reexporta aquí.
 * - `quoteFormSchema` define la estructura completa del formulario de cotización
 *   (cliente, dirección, condiciones y `items`).
 */
import { z } from "zod";
import { quoteItemSchema } from "./quote-item.schema";

export { quoteItemSchema } from "./quote-item.schema";

export const quoteFormSchema = z.object({
  clienteBusqueda: z.string().optional(),
  clienteNombre: z.string().optional(),
  razonSocial: z.string().optional(),
  rfc: z.string().optional(),
  regimenFiscal: z.string().optional(),
  direccionFiscal: z.string().optional(),
  coloniaFiscal: z.string().optional(),
  codigoPostalFiscal: z.string().optional(),
  ciudadFiscal: z.string().optional(),
  estadoFiscal: z.string().optional(),
  giroEmpresa: z.string().optional(),
  persona_pagos: z.string().optional(),
  correo_facturas: z.string().refine((val) => !val || z.string().email().safeParse(val).success, { message: "Correo inválido" }).optional(),
  telefono_pagos: z.string().optional(),
  oc: z.string().trim().optional(),
  forma_pago: z.string().optional(),
  metodo_pago: z.string().optional(),
  uso_cfdi: z.string().optional(),
  referenciarOcFactura: z.boolean().optional(),
  condicionPago: z.enum(
    [
      "100_anticipo",
      "50_anticipo",
      "vendedor_autoriza",
      "pago_antes_embarque",
      "por_confirmar",
      "otra_cantidad",
    ],
    { message: "Requerido" }
  ).optional(),
  condicionPagoMonto: z.coerce.number().min(0, "No puede ser negativo").optional(),
  fecha: z.string().optional(),
  agente: z.string().trim().optional(),
  tipo_pedido: z.coerce.number().optional(),
  origen: z.string().optional(),
  destinatario: z.string().optional(),
  empresaEnvio: z.string().optional(),
  telefonoEnvio: z.string().optional(),
  celularEnvio: z.string().optional(),
  direccionEnvio: z.string().optional(),
  coloniaEnvio: z.string().optional(),
  codigoPostalEnvio: z.string().optional(),
  ciudadEnvio: z.string().optional(),
  estadoEnvio: z.string().optional(),
  referenciasEnvio: z.string().optional(),
  enviarDomicilioFiscal: z.boolean().optional(),
  embarcarConOtrosPedidos: z.boolean().optional(),
  empaque_ecologico: z.boolean().optional(),
  embarque_parcial: z.boolean().optional(),
  comentarios_parcialidad: z.string().optional(),
  servicioEnvioActivo: z.boolean().optional(),
  envio: z.coerce.number().min(0, "No puede ser negativo").optional(),
  programaBordadosActivo: z.boolean().optional(),
  programa_bordados: z.coerce.number().min(0, "No puede ser negativo").optional(),
  bordadoPantalonesExtrasActivo: z.boolean().optional(),
  bordado_pantalones_extras: z.coerce.number().min(0, "No puede ser negativo").optional(),
  serigrafiaActivo: z.boolean().optional(),
  serigrafia: z.coerce.number().min(0, "No puede ser negativo").optional(),
  reflejanteActivo: z.boolean().optional(),
  reflejante: z.coerce.number().min(0, "No puede ser negativo").optional(),
  bordado_logotipo: z.boolean().optional(),
  estatusPedido: z.enum(["Pendiente", "Parcial", "Completo", "Cancelado"], {
    message: "Requerido",
  }).optional(),
  docRelacionado: z.string().optional(),
  observaciones: z.string().optional(),
  flete: z.coerce.number().min(0, "No puede ser negativo").optional(),
  seguros: z.coerce.number().min(0, "No puede ser negativo").optional(),
  anticipo: z.coerce.number().min(0, "No puede ser negativo").optional(),
  iva: z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo").optional(),
  moneda: z.coerce.number().optional(),
  items: z.array(quoteItemSchema).optional(),
}).superRefine((data, ctx) => {
  if (data.condicionPago === "otra_cantidad" && (data.condicionPagoMonto == null || data.condicionPagoMonto <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["condicionPagoMonto"],
      message: "Especifica un monto válido",
    });
  }
  if (data.embarque_parcial && !data.comentarios_parcialidad?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["comentarios_parcialidad"],
      message: "Agrega los comentarios de parcialidad",
    });
  }
});

export const quoteExtraServiceSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().optional(),
  monto: z.coerce.number().optional(),
  quantity: z.coerce.number().optional(),
});

export const quoteSubmitSchema = quoteFormSchema.and(
  z.object({
    servicios_extras: z.array(quoteExtraServiceSchema),
  })
);

export type QuoteFormInput = z.input<typeof quoteFormSchema>;
export type QuoteFormValues = z.output<typeof quoteFormSchema>;
