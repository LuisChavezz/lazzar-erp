import { z } from "zod";

/**
 * Validación del FORMULARIO de bancos (no del payload: el mapeo de `""` a
 * `null` vive en `useBankForm`).
 *
 * Los máximos replican los `max_length` del modelo (`finanzas/models.py`,
 * `class Banco`) para dar feedback inmediato en vez de esperar el 400.
 *
 * `nombre` y `codigo` se exigen aquí aunque el modelo los declare
 * `null=True, blank=True`: es una regla MÁS ESTRICTA del frontend —un banco sin
 * nombre no es identificable en el listado ni en los selectores que lo
 * consumirán— y no una lectura del contrato. Registros antiguos con esos campos
 * en `null` siguen llegando del backend y se muestran como "—" (ver `Banco`).
 */
export const BankFormSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  codigo: z
    .string()
    .min(1, "El código es requerido")
    .max(20, "El código no puede exceder 20 caracteres"),
  swift: z.string().max(20, "El SWIFT no puede exceder 20 caracteres"),
  observaciones: z.string(),
});

export type BankFormValues = z.infer<typeof BankFormSchema>;
