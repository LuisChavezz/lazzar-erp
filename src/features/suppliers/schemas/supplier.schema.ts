import { z } from "zod";

export const SupplierFormSchema = z.object({
  // ── Campos requeridos ──────────────────────────────────────────────────
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  razon_social: z.string().min(1, "La razón social es requerida"),
  rfc: z.string().min(1, "El RFC es requerido"),
  // El backend rechaza estos tres en blanco (400 "Este campo no puede estar en
  // blanco."). `.trim()` antes de `.min(1)`: solo espacios tampoco cuenta.
  email: z.string().trim().min(1, "El correo es requerido").email("Email inválido"),
  telefono: z.string().trim().min(1, "El teléfono es requerido"),
  contacto_principal: z.string().trim().min(1, "El contacto principal es requerido"),

  // ── Campos opcionales ──────────────────────────────────────────────────
  // Se mantienen las validaciones de formato/valor, pero no son obligatorios.
  dias_credito: z.coerce.number().int().min(0, "No puede ser negativo"),
  limite_credito: z.string(),

  // ── Catálogos (obligatorios) ───────────────────────────────────────────
  // `0` es el "Seleccionar..." del select: sin opción elegida no se envía.
  // En edición, un valor ausente o fuera del catálogo llega como `0` (ver
  // `editValues` en `useSupplierForm`) en vez de sustituirse por el id 1.
  sat_regimen_fiscal: z.coerce.number().int().positive("Selecciona un régimen fiscal"),
  sat_forma_pago: z.coerce.number().int().positive("Selecciona una forma de pago"),
  sat_metodo_pago: z.coerce.number().int().positive("Selecciona un método de pago"),
  moneda: z.coerce.number().int().positive("Selecciona una moneda"),
});

export type SupplierFormValues = z.infer<typeof SupplierFormSchema>;
