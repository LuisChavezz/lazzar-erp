import { z } from "zod";

export const WarehouseFormSchema = z.object({
  name: z.string().min(1, "El nombre del almacén es requerido"),
  location: z.string().min(1, "La ubicación es requerida"),
  manager: z.string().min(1, "El responsable es requerido"),
  capacity: z.number().min(1, "La capacidad es requerida"),
  status: z.enum(["Activo", "Inactivo", "Mantenimiento"], {
    message: "El estatus es requerido.",
  }),
  type: z.string().min(1, "El tipo de almacén es requerido"),
});

export type WarehouseFormValues = z.infer<typeof WarehouseFormSchema>;
