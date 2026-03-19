import { z } from "zod";

export const CustomerFormSchema = z.object({
  razon_social: z.string().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  telefono: z.string().min(1, "Requerido"),
  correo: z.string().email("Correo inválido"),
  rfc: z.string().min(1, "Requerido"),
  direccion_fiscal: z.string().min(1, "Requerido"),
  colonia: z.string().min(1, "Requerido"),
  codigo_postal: z.string().min(1, "Requerido"),
  ciudad: z.string().min(1, "Requerido"),
  estado: z.string().min(1, "Requerido"),
  giro_empresarial: z.string().min(1, "Requerido"),
  sat_regimen_fiscal: z.number().int().min(1, "Requerido"),
  sat_uso_cfdi: z.number().int().min(1, "Requerido"),
});

export type CustomerFormValues = z.output<typeof CustomerFormSchema>;
