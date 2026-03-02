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
  clienteId: z.string().min(1, "Requerido"),
  clienteNombre: z.string().min(1, "Requerido"),
  pedidoCliente: z.string().min(1, "Requerido"),
  fecha: z.string().min(1, "Requerido"),
  fechaVence: z.string().min(1, "Requerido"),
  agente: z.string().trim().min(1, "Requerido"),
  tipoDocumento: z.string().min(1, "Requerido"),
  origen: z.array(z.string().min(1, "Requerido")).min(1, "Selecciona al menos un origen"),
  comision: z.coerce.number().min(0, "No puede ser negativo"),
  plazo: z.coerce.number().min(0, "No puede ser negativo"),
  sucursal: z.coerce.number().min(1, "Requerido"),
  almacen: z.coerce.number().min(1, "Requerido"),
  canal: z.string().min(1, "Requerido"),
  puntos: z.coerce.number().min(0, "No puede ser negativo"),
  anticipoReq: z.coerce.number().min(0, "No puede ser negativo"),
  pedidoInicial: z.boolean(),
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
  const parseDate = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };
  const fecha = parseDate(data.fecha) ?? new Date(new Date().toISOString().split("T")[0]);
  const fechaVence = parseDate(data.fechaVence);
  if (!fechaVence || fechaVence < fecha) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fechaVence"],
      message: "La fecha de vencimiento no puede ser menor a la fecha actual",
    });
  }
});

export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;
