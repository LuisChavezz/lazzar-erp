import { z } from "zod";

export const SupplierFormSchema = z.object({
  // ── Campos requeridos ──────────────────────────────────────────────────
  // Solo estos cuatro campos son obligatorios para dar de alta un proveedor.
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  razon_social: z.string().min(1, "La razón social es requerida"),
  rfc: z.string().min(1, "El RFC es requerido"),

  // ── Campos opcionales ──────────────────────────────────────────────────
  // Se mantienen las validaciones de formato/valor, pero ya no son obligatorios:
  // se aceptan vacíos (cadena "" o 0) sin disparar error.
  email: z.string().email("Email inválido").or(z.literal("")),
  telefono: z.string(),
  contacto_principal: z.string(),
  dias_credito: z.coerce.number().int().min(0, "No puede ser negativo"),
  limite_credito: z.string(),
  sat_regimen_fiscal: z.coerce.number().int(),
  sat_forma_pago: z.coerce.number().int(),
  sat_metodo_pago: z.coerce.number().int(),
  moneda: z.coerce.number().int(),
});

export type SupplierFormValues = z.infer<typeof SupplierFormSchema>;
