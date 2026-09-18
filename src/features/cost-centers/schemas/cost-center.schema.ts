import { z } from "zod";

/**
 * Validación del FORMULARIO de centros de costo (no del payload: el recorte de
 * los textos y el mapeo `""` → `null` de `descripcion` viven en
 * `useCostCenterForm`, igual que en áreas y en bancos).
 *
 * Los máximos replican los `max_length` del modelo para dar el aviso en el acto
 * en vez de esperar el 400.
 *
 * ─── DÓNDE ES MÁS ESTRICTO QUE EL BACKEND ────────────────────────────────────
 *
 * `codigo` se EXIGE aquí aunque el backend acepte `""`. Es la misma decisión que
 * tomaron bancos y el plan de cuentas (EC-139): una regla más estricta del
 * frontend, no una lectura del contrato. El código ES el identificador con el
 * que se opera —es lo que se teclea, lo que ordena el catálogo y lo que el
 * backend declara único entre los activos de la empresa—, así que un centro de
 * costo sin código no es utilizable. Los registros antiguos que ya tengan
 * `codigo: ""` siguen llegando del listado y se muestran como "—"; al abrirlos
 * para editar, el formulario pedirá capturarlo.
 *
 * `activo` NO está aquí: no se captura en el formulario, se administra desde la
 * acción de la fila (ver `CostCenterCreate`).
 */
export const CostCenterFormSchema = z.object({
  // `.trim()` ANTES de `.min(1)`: el payload se arma con el valor recortado, así
  // que validar el crudo dejaba pasar una captura de solo espacios —"   " mide 1
  // y superaba el requerido— que llegaba al backend como "". Mismo orden que
  // `BankAccountFormSchema`.
  codigo: z
    .string()
    .trim()
    .min(1, "El código es requerido")
    .max(30, "El código no puede exceder 30 caracteres"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  /**
   * Opcional: el modelo lo declara nullable. Se captura como TEXTO —un
   * `<textarea>` vacío devuelve `""`, no `null`— y el hook lo convierte a `null`
   * al armar el payload. Sin `max`: el backend lo declara `TextField`, sin tope.
   */
  descripcion: z.string(),
});

export type CostCenterFormValues = z.infer<typeof CostCenterFormSchema>;

/** Valores iniciales del alta. */
export const createEmptyCostCenterForm = (): CostCenterFormValues => ({
  codigo: "",
  nombre: "",
  descripcion: "",
});
