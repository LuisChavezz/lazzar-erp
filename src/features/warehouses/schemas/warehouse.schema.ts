import { z } from "zod";

export const WarehouseFormSchema = z.object({
  sucursal: z.number().min(1, "La sucursal es requerida"),
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre del almacén es requerido"),
  estatus: z.enum(["Activo", "Inactivo", "Mantenimiento"], {
    message: "El estatus es requerido.",
  }),
});

export type WarehouseFormValues = z.infer<typeof WarehouseFormSchema>;
