import { z } from "zod";

export const UserFormSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  first_name: z.string().min(1, "El nombre es requerido"),
  last_name: z.string().min(1, "El apellido es requerido"),
  sucursal_default: z.coerce.number().min(1, "La sucursal por defecto es requerida"),
  sucursales: z.array(z.coerce.number()).min(1, "Debe seleccionar al menos una sucursal"),
  is_active: z.boolean().default(true),
});

export type UserFormValues = z.infer<typeof UserFormSchema>;
