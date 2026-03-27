import { z } from "zod";

const IMAGE_URL_EXTENSION_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?(#.*)?$/i;

const imageUrlSchema = z.string().trim().url("URL inválida").refine(
  (value) => {
    try {
      const parsed = new URL(value);
      return IMAGE_URL_EXTENSION_REGEX.test(parsed.pathname + parsed.search + parsed.hash);
    } catch {
      return false;
    }
  },
  "Debe incluir una extensión de imagen válida"
);

const orderItemSizeSchema = z.object({
  tallaId: z.coerce.number().int().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  cantidad: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .int("Debe ser un número entero")
    .min(1, "Debe ser mayor o igual a 1"),
});

const embroiderySpecSchema = z.object({
  posicionCodigo: z.string().min(1, "Requerido"),
  posicionNombre: z.string().min(1, "Requerido"),
  ancho: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .gt(0, "Debe ser positivo")
    .optional(),
  alto: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .gt(0, "Debe ser positivo")
    .optional(),
  colorHilo: z.string().min(1, "Requerido"),
  imagen: imageUrlSchema,
});

const embroiderySchema = z.object({
  activo: z.boolean(),
  nuevoPonchado: z.boolean(),
  observaciones: z.string().optional(),
  especificaciones: z.array(embroiderySpecSchema),
});

export const orderItemSchema = z
  .object({
  productoId: z.coerce.number().min(1, "Requerido"),
  descripcion: z.string().min(1, "Requerido"),
  unidad: z.string().min(1, "Requerido"),
  cantidad: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .int("Debe ser un número entero")
    .min(1, "Debe ser mayor o igual a 1"),
  precio: z.coerce.number().gt(0, "Debe ser positivo"),
  descuento: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .int("Debe ser un número entero")
    .min(0, "No puede ser menor a 0")
    .max(100, "No puede ser mayor a 100"),
  importe: z.coerce.number().min(0, "No puede ser negativo"),
  tallas: z.array(orderItemSizeSchema).optional(),
  bordados: embroiderySchema.optional(),
})
  .superRefine((data, ctx) => {
    if (!data.bordados?.activo) return;
    if (!data.bordados.especificaciones || data.bordados.especificaciones.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bordados", "especificaciones"],
        message: "Agrega al menos una especificación",
      });
    }
    const used = new Set<string>();
    data.bordados.especificaciones.forEach((spec, index) => {
      if (used.has(spec.posicionCodigo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bordados", "especificaciones", index, "posicionCodigo"],
          message: "La ubicación ya fue seleccionada",
        });
      }
      used.add(spec.posicionCodigo);
    });
  });

export const orderFormSchema = z.object({
  clienteBusqueda: z.string().min(1, "Selecciona un cliente"),
  clienteNombre: z.string().min(1, "Requerido"),
  razonSocial: z.string().min(1, "Requerido"),
  rfc: z.string().min(1, "Requerido"),
  regimenFiscal: z.string().min(1, "Requerido"),
  direccionFiscal: z.string().min(1, "Requerido"),
  coloniaFiscal: z.string().min(1, "Requerido"),
  codigoPostalFiscal: z.string().min(1, "Requerido"),
  ciudadFiscal: z.string().min(1, "Requerido"),
  estadoFiscal: z.string().min(1, "Requerido"),
  giroEmpresa: z.string().min(1, "Requerido"),
  persona_pagos: z.string().min(1, "Requerido"),
  correo_facturas: z.string().email("Correo inválido"),
  telefono_pagos: z.string().min(1, "Requerido"),
  oc: z.string().trim().optional(),
  forma_pago: z.string().min(1, "Requerido"),
  metodo_pago: z.string().min(1, "Requerido"),
  uso_cfdi: z.string().min(1, "Requerido"),
  referenciarOcFactura: z.boolean(),
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
  ),
  condicionPagoMonto: z.coerce.number().min(0, "No puede ser negativo"),
  fecha: z.string().min(1, "Requerido"),
  agente: z.string().trim().min(1, "Requerido"),
  tipo_pedido: z.coerce.number().int("Requerido").min(1, "Requerido"),
  origen: z.string().min(1, "Selecciona un origen"),
  destinatario: z.string().min(1, "Requerido"),
  empresaEnvio: z.string().min(1, "Requerido"),
  telefonoEnvio: z.string().min(1, "Requerido"),
  celularEnvio: z.string().min(1, "Requerido"),
  direccionEnvio: z.string().min(1, "Requerido"),
  coloniaEnvio: z.string().min(1, "Requerido"),
  codigoPostalEnvio: z.string().min(1, "Requerido"),
  ciudadEnvio: z.string().min(1, "Requerido"),
  estadoEnvio: z.string().min(1, "Requerido"),
  referenciasEnvio: z.string().optional(),
  enviarDomicilioFiscal: z.boolean(),
  embarcarConOtrosPedidos: z.boolean(),
  empaque_ecologico: z.boolean(),
  embarque_parcial: z.boolean(),
  comentarios_parcialidad: z.string().optional(),
  servicioEnvioActivo: z.boolean(),
  envio: z.coerce.number().min(0, "No puede ser negativo"),
  programaBordadosActivo: z.boolean(),
  programa_bordados: z.coerce.number().min(0, "No puede ser negativo"),
  bordadoPantalonesExtrasActivo: z.boolean(),
  bordado_pantalones_extras: z.coerce.number().min(0, "No puede ser negativo"),
  serigrafiaActivo: z.boolean(),
  serigrafia: z.coerce.number().min(0, "No puede ser negativo"),
  reflejanteActivo: z.boolean(),
  reflejante: z.coerce.number().min(0, "No puede ser negativo"),
  bordado_logotipo: z.boolean(),
  estatusPedido: z.enum(["Pendiente", "Parcial", "Completo", "Cancelado"], {
    message: "Requerido",
  }),
  docRelacionado: z.string().optional(),
  observaciones: z.string().optional(),
  flete: z.coerce.number().min(0, "No puede ser negativo"),
  seguros: z.coerce.number().min(0, "No puede ser negativo"),
  anticipo: z.coerce.number().min(0, "No puede ser negativo"),
  iva: z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo"),
  moneda: z.coerce.number().int("Requerido").min(1, "Requerido"),
  items: z.array(orderItemSchema).min(1, "Agrega al menos un producto"),
}).superRefine((data, ctx) => {
  if (data.condicionPago === "otra_cantidad" && data.condicionPagoMonto <= 0) {
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

export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;
