import { z } from "zod";

export const LocationFormSchema = z.object({
  almacen: z.number().min(1, "El almacén es requerido"),
  pasillo: z.string().min(1, "El pasillo es requerido"),
  rack: z.string().min(1, "El rack es requerido"),
  estatus: z.enum(["ACTIVO", "INACTIVO"], {
    message: "El estatus es requerido.",
  }),
});

export type LocationFormValues = z.infer<typeof LocationFormSchema>;
