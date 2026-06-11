import { z } from "zod";

export const SupplierFormSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  razon_social: z.string().min(1, "La razón social es requerida"),
  rfc: z.string().min(1, "El RFC es requerido"),
  email: z.string().min(1, "El email es requerido").email("Email inválido"),
  telefono: z.string().min(1, "El teléfono es requerido"),
  contacto_principal: z.string().min(1, "El contacto principal es requerido"),
  dias_credito: z.coerce.number().int().min(0, "No puede ser negativo"),
  limite_credito: z.string().min(1, "El límite de crédito es requerido"),
  sat_regimen_fiscal: z.coerce.number().int().positive("Seleccione un régimen fiscal"),
  sat_forma_pago: z.coerce.number().int().positive("Seleccione una forma de pago"),
  sat_metodo_pago: z.coerce.number().int().positive("Seleccione un método de pago"),
  moneda: z.coerce.number().int().positive("Seleccione una moneda"),
  fax: z.string().min(1, "El fax es requerido"),
});

export type SupplierFormValues = z.infer<typeof SupplierFormSchema>;
