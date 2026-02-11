import { z } from "zod";

export const FiscalAddressSchema = z.object({
  calle: z.string().min(1, "La calle es requerida"),
  numero_exterior: z.string().min(1, "El número exterior es requerido"),
  numero_interior: z.string().optional(),
  colonia: z.string().min(1, "La colonia es requerida"),
  localidad: z.string().optional(),
  municipio: z.string().min(1, "El municipio es requerido"),
  estado: z.string().min(1, "El estado es requerido"),
  pais: z.string().min(1, "El país es requerido"),
  codigo_postal: z.string().length(5, "El código postal debe tener 5 dígitos"),
});

export type FiscalAddressFormValues = z.infer<typeof FiscalAddressSchema>;
