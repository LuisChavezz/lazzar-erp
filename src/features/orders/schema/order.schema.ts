import { z } from "zod";

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
    .gt(0, "Debe ser positivo"),
  alto: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .gt(0, "Debe ser positivo"),
  colorHilo: z.string().min(1, "Requerido"),
});

const embroiderySchema = z.object({
  activo: z.boolean(),
  nuevoPonchado: z.boolean(),
  observaciones: z.string().optional(),
  especificaciones: z.array(embroiderySpecSchema),
});

export const orderItemSchema = z
  .object({
  sku: z.string().min(1, "Requerido"),
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
  regimenFiscal: z.enum(["601", "603", "605"], {
    message: "Requerido",
  }),
  direccionFiscal: z.string().min(1, "Requerido"),
  coloniaFiscal: z.string().min(1, "Requerido"),
  codigoPostalFiscal: z.string().min(1, "Requerido"),
  ciudadFiscal: z.string().min(1, "Requerido"),
  estadoFiscal: z.string().min(1, "Requerido"),
  giroEmpresa: z.string().min(1, "Requerido"),
  personaPagos: z.string().min(1, "Requerido"),
  correoFacturas: z.string().email("Correo inválido"),
  telefonoPagos: z.string().min(1, "Requerido"),
  ordenCompra: z.string().optional(),
  formaPago: z.enum(["01", "03", "04"], { message: "Requerido" }),
  metodoPago: z.enum(["PUE", "PPD", "NA"], { message: "Requerido" }),
  usoCfdi: z.enum(["G03", "G01", "I01"], { message: "Requerido" }),
  referenciarOcFactura: z.boolean(),
  condicionPago100Anticipo: z.boolean(),
  condicionPago50Anticipo: z.boolean(),
  condicionPagoVendedorAutoriza: z.boolean(),
  condicionPagoPagoAntesEmbarque: z.boolean(),
  condicionPagoPorConfirmar: z.boolean(),
  condicionPagoOtraCantidad: z.boolean(),
  condicionPagoMonto: z.coerce.number().min(0, "No puede ser negativo"),
  fecha: z.string().min(1, "Requerido"),
  agente: z.string().trim().min(1, "Requerido"),
  tipoDocumento: z.string().min(1, "Requerido"),
  origen: z.array(z.string().min(1, "Requerido")).min(1, "Selecciona al menos un origen"),
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
  empaqueEcologico: z.boolean(),
  embarqueParcial: z.boolean(),
  comentariosParcialidad: z.string().optional(),
  servicioEnvioActivo: z.boolean(),
  servicioEnvioMonto: z.coerce.number().min(0, "No puede ser negativo"),
  programaBordadosActivo: z.boolean(),
  programaBordadosMonto: z.coerce.number().min(0, "No puede ser negativo"),
  bordadoPantalonesExtrasActivo: z.boolean(),
  bordadoPantalonesExtrasMonto: z.coerce.number().min(0, "No puede ser negativo"),
  bordadoLogotipoIncluido: z.boolean(),
  estatusPedido: z.enum(["Pendiente", "Parcial", "Completo", "Cancelado"], {
    message: "Requerido",
  }),
  docRelacionado: z.string().min(1, "Requerido"),
  observaciones: z.string().optional(),
  flete: z.coerce.number().min(0, "No puede ser negativo"),
  seguro: z.coerce.number().min(0, "No puede ser negativo"),
  anticipo: z.coerce.number().min(0, "No puede ser negativo"),
  iva: z.coerce.number().min(0, "No puede ser negativo"),
  items: z.array(orderItemSchema).min(1, "Agrega al menos un producto"),
}).superRefine((data, ctx) => {
  if (data.condicionPagoOtraCantidad && data.condicionPagoMonto <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["condicionPagoMonto"],
      message: "Especifica un monto válido",
    });
  }
  if (data.embarqueParcial && !data.comentariosParcialidad?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["comentariosParcialidad"],
      message: "Agrega los comentarios de parcialidad",
    });
  }
});

export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;
