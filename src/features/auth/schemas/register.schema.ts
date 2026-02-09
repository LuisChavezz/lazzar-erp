import { z } from "zod";

export const UserSchema = z.object({
  usuario_first_name: z.string().min(1, "El nombre es requerido"),
  usuario_last_name: z.string().min(1, "El apellido es requerido"),
  usuario_username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  usuario_email: z.string().email("Correo electrónico inválido"),
  usuario_password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  usuario_password_confirm: z.string().min(1, "Debes confirmar la contraseña"),
});

export const CompanySchema = z.object({
  empresa_razon_social: z.string().min(1, "La razón social es requerida"),
  empresa_rfc: z.string().min(12, "El RFC debe tener al menos 12 caracteres").max(13, "El RFC debe tener máximo 13 caracteres"),
  empresa_email: z.string().email("Correo electrónico inválido"),
  empresa_codigo: z.string().min(3, "El código debe tener al menos 3 caracteres"),
});

export const BranchSchema = z.object({
  sucursal_nombre: z.string().min(1, "El nombre de la sucursal es requerido"),
  sucursal_codigo: z.string().min(3, "El código de la sucursal debe tener al menos 3 caracteres"),
});

export const RegisterSchema = z.intersection(
  UserSchema.refine((data) => data.usuario_password === data.usuario_password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["usuario_password_confirm"],
  }),
  CompanySchema.merge(BranchSchema)
);

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
