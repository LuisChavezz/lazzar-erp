import { z } from "zod";

/**
 * Validación del FORMULARIO de cuentas bancarias (no del payload: el mapeo de
 * `""` a `null` vive en `useBankAccountForm`).
 *
 * Los máximos replican los `max_length` del modelo para dar feedback inmediato
 * en vez de esperar el 400.
 *
 * OBLIGATORIEDAD: en el backend TODO campo de texto de este modelo es
 * `null=True, blank=True`. Exigir `alias` y `numero_cuenta` es una regla MÁS
 * ESTRICTA DEL FRONTEND —igual que `nombre`/`codigo` en `banks` (EC-135)—, no
 * una lectura del contrato: `alias` es la etiqueta con la que la cuenta se
 * identifica en el listado y `numero_cuenta` es el dato que la distingue de
 * otra del mismo banco. Los registros antiguos que ya tengan esos campos en
 * `null` siguen llegando y se muestran como "—".
 *
 * `banco` y `moneda` sí son obligatorios en el backend (FK no nulos); `0` es el
 * centinela de la opción "Seleccionar..." de cada select.
 *
 * NO se capturan aquí: `saldo_actual` (lo mantienen `PagoService`/`CobroService`
 * al aplicar documentos), `activo` (acción de la fila) ni `empresa` (la resuelve
 * el backend).
 */
export const BankAccountFormSchema = z.object({
  banco: z.number().int("El banco es inválido").positive("El banco es requerido"),
  moneda: z.number().int("La moneda es inválida").positive("La moneda es requerida"),
  // `.trim()` ANTES de `.min(1)`: el payload se arma con el valor recortado, así
  // que validar el crudo dejaba pasar una captura de solo espacios —"   " mide 1
  // y superaba el requerido— que llegaba al backend como "". Mismo orden que
  // `CreateAvanceFormSchema`.
  alias: z
    .string()
    .trim()
    .min(1, "El alias es requerido")
    .max(100, "El alias no puede exceder 100 caracteres"),
  titular: z.string().max(150, "El titular no puede exceder 150 caracteres"),
  // Sucursal DEL BANCO: texto libre, no un FK a `nucleo.Sucursal`.
  sucursal_bancaria: z
    .string()
    .max(150, "La sucursal no puede exceder 150 caracteres"),
  numero_cuenta: z
    .string()
    .trim()
    .min(1, "El número de cuenta es requerido")
    .max(30, "El número de cuenta no puede exceder 30 caracteres"),
  // Sin regla de formato: aunque una CLABE mexicana son 18 dígitos, el modelo
  // admite 30 caracteres y no consta que el backend valide el formato, así que
  // imponerlo aquí rechazaría capturas que el servidor sí acepta.
  clabe: z.string().max(30, "La CLABE no puede exceder 30 caracteres"),
  numero_cliente: z
    .string()
    .max(30, "El número de cliente no puede exceder 30 caracteres"),
  convenio: z.string().max(50, "El convenio no puede exceder 50 caracteres"),
  // `<input type="date">` entrega "" o "YYYY-MM-DD"; el mapeo de "" a `null`
  // ocurre al armar el payload.
  fecha_apertura: z.string(),
  observaciones: z.string(),
});

export type BankAccountFormValues = z.infer<typeof BankAccountFormSchema>;
