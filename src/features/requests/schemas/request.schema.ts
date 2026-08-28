/**
 * Schemas principales del formulario de solicitud.
 * - `requestItemSchema` está separado en su propio módulo y se reexporta aquí.
 * - `requestFormSchema` define la estructura completa del formulario de solicitud
 *   (cliente, dirección, condiciones y `items`).
 *
 * ── Por qué esto es un CLON y no un reexport de `quotes/schemas/quote.schema.ts`
 *
 * Hoy la solicitud es campo por campo idéntica a la cotización porque el
 * formulario es una réplica del de cotizaciones. Todavía NO existe endpoint ni
 * tabla de solicitudes; cuando existan, la forma va a divergir (la solicitud
 * pedirá alta de producto/muestra y cotización de pedido especial, no un pedido
 * de venta). Mantener aquí una capa de tipos propia hace que esa divergencia sea
 * una edición local a este archivo, en vez de un cambio en el schema de
 * cotizaciones —que sí está en producción— o un `Omit<>` encima de él.
 *
 * Lo que NO se clonó y se importa de `quotes`: los hooks de datos
 * (`useQuoteOnboardingData`, `useCurrencies`, `useCustomerAddresses`), el
 * catálogo de posiciones de bordado y el componente de presentación
 * `QuoteFormContent`. Ver `hooks/useRequestForm.ts`.
 */
import { z } from "zod";
import { requestItemSchema } from "./request-item.schema";

export { requestItemSchema } from "./request-item.schema";

export const requestFormSchema = z.object({
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
  tipo_pedido: z.coerce.number().int().min(1, "Selecciona un tipo de pedido").optional(),
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
  items: z.array(requestItemSchema).optional(),
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
  // Mínimos de captura. En cotizaciones estos no se validan en cliente: el
  // formulario POSTea y el backend responde 400, que `applyServerValidationIssues`
  // convierte en errores por campo. Solicitudes no tiene endpoint ni esa rama,
  // así que sin estas reglas un formulario en blanco pasaría la validación.
  // Ambas rutas ya tienen `data-error-anchor` en el JSX, de modo que el scroll
  // al primer error funciona sin tocar el componente.
  if (!data.clienteBusqueda?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clienteBusqueda"],
      message: "Selecciona un cliente",
    });
  }
  if (!data.items || data.items.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Agrega al menos un producto",
    });
  }
});

export const requestExtraServiceSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().optional(),
  monto: z.coerce.number().optional(),
  cantidad: z.coerce.number().optional(),
});

export const requestSubmitSchema = requestFormSchema.and(
  z.object({
    servicios_extras: z.array(requestExtraServiceSchema),
  })
);

export type RequestFormInput = z.input<typeof requestFormSchema>;
export type RequestFormValues = z.output<typeof requestFormSchema>;
