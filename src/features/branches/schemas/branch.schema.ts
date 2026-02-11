import { z } from "zod";

export const BranchFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().min(1, "El código es requerido"),
  telefono: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().optional().or(z.literal("")),
  direccion_linea1: z.string().nullable().optional(),
  direccion_linea2: z.string().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cp: z.string().nullable().optional(),
  pais: z.string().nullable().optional(),
  estatus: z.enum(["activo", "inactivo"], {
    message: "Estatus inválido",
  }),
});

export type BranchFormValues = z.infer<typeof BranchFormSchema>;
