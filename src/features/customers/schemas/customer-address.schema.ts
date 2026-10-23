import { z } from "zod";
import { telefonoSchema } from "@/src/utils/telefonoSchema";

export const CustomerAddressFormSchema = z.object({
  destinatario: z.string().min(1, "Requerido"),
  empresa_envio: z.string().min(1, "Requerido"),
  telefono_envio: z.string().min(1, "Requerido").pipe(telefonoSchema),
  celular_envio: z.string().min(1, "Requerido").pipe(telefonoSchema),
  direccion_envio: z.string().min(1, "Requerido"),
  colonia_envio: z.string().min(1, "Requerido"),
  codigo_postal: z.string().min(1, "Requerido"),
  ciudad_envio: z.string().min(1, "Requerido"),
  estado_envio: z.string().min(1, "Requerido"),
  referencias: z.string().optional(),
  is_default: z.boolean().optional(),
});

export type CustomerAddressFormValues = z.output<typeof CustomerAddressFormSchema>;
