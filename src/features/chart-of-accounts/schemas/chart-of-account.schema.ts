import { z } from "zod";
import { CUENTA_CONTABLE_TIPOS } from "../constants/chartOfAccountTipo";

/**
 * Validación del FORMULARIO del plan de cuentas (no del payload: la conversión
 * de `nivel` a número y el recorte de los textos viven en
 * `useChartOfAccountForm`, igual que el mapeo `""` → `null` de bancos vive en su
 * hook).
 *
 * Los máximos replican los `max_length` del modelo para dar el aviso en el acto
 * en vez de esperar el 400.
 *
 * ─── DÓNDE ES MÁS ESTRICTO QUE EL BACKEND ────────────────────────────────────
 *
 * `codigo` se EXIGE aquí aunque el backend acepte `""`. Es la misma decisión que
 * tomó bancos con su `codigo`/`nombre`: una regla más estricta del frontend, no
 * una lectura del contrato. En un plan de cuentas el código ES el identificador
 * con el que se opera —es lo que se teclea, lo que ordena el catálogo y lo que
 * el backend declara único por empresa—, así que una cuenta sin código no es
 * utilizable. Los registros antiguos que ya tengan `codigo: ""` siguen llegando
 * del listado y se muestran como "—"; al abrirlos para editar, el formulario
 * pedirá capturarlo.
 */
export const ChartOfAccountFormSchema = z.object({
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
  tipo: z.enum(CUENTA_CONTABLE_TIPOS, "Selecciona el tipo de cuenta"),
  /**
   * Se captura como TEXTO y se valida como entero positivo: un `<input>` devuelve
   * string, y aceptar `number` obligaría a distinguir el vacío del cero. La
   * conversión a número la hace el hook al armar el payload.
   *
   * El backend no impone tope ni coherencia con `cuenta_padre`; el 30 de aquí
   * solo evita un nivel absurdo por un dedazo.
   */
  nivel: z
    .string()
    .regex(/^\d+$/, "El nivel debe ser un número entero")
    .refine((value) => Number(value) >= 1, "El nivel debe ser 1 o mayor")
    .refine((value) => Number(value) <= 30, "El nivel no puede exceder 30"),
  acepta_movimientos: z.boolean(),
});

export type ChartOfAccountFormValues = z.infer<typeof ChartOfAccountFormSchema>;

/**
 * Valores iniciales del alta. `nivel` arranca en "1" —el default del modelo— y
 * `acepta_movimientos` en `true`: el caso normal es una cuenta de detalle que
 * recibe asientos; las de agrupación son la excepción y se marcan a propósito.
 */
export const createEmptyChartOfAccountForm = (): ChartOfAccountFormValues => ({
  codigo: "",
  nombre: "",
  tipo: "Activo",
  nivel: "1",
  acepta_movimientos: true,
});
