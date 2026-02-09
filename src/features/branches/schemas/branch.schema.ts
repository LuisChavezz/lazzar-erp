import { z } from "zod";

export const BranchFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().min(1, "El código es requerido"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion_linea1: z.string().optional(),
  direccion_linea2: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  cp: z.string().optional(),
  pais: z.string().optional(),
  estatus: z.enum(["activo", "inactivo"], {
    message: "Estatus inválido",
  }),
});

export type BranchFormValues = z.infer<typeof BranchFormSchema>;
