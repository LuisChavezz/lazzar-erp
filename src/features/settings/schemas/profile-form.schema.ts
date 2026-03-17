import { z } from "zod";

export const ProfileFormSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().min(1, "El correo es obligatorio").email("Correo inválido"),
  biography: z.string().trim().min(1, "La biografía es obligatoria"),
});

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
