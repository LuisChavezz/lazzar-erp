import { z } from "zod";

export const CustomerAddressFormSchema = z.object({
  destinatario: z.string().min(1, "Requerido"),
  empresa_envio: z.string().min(1, "Requerido"),
  telefono_envio: z.string().min(1, "Requerido"),
  celular_envio: z.string().min(1, "Requerido"),
  direccion_envio: z.string().min(1, "Requerido"),
  colonia_envio: z.string().min(1, "Requerido"),
  codigo_postal: z.string().min(1, "Requerido"),
  ciudad_envio: z.string().min(1, "Requerido"),
  estado_envio: z.string().min(1, "Requerido"),
  referencias: z.string().optional(),
  is_default: z.boolean().optional(),
});

export type CustomerAddressFormValues = z.output<typeof CustomerAddressFormSchema>;
