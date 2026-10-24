import { z } from "zod";
import { toSendableDecimal } from "@/src/utils/decimal";

/**
 * Esquemas del asistente de captura de packing.
 *
 * A diferencia de picking (encabezado completo en el Paso 1: pedido, almacén,
 * operador, prioridad, tipo), aquí el Paso 1 SOLO elige el picking origen —
 * operador/almacén/empresa/sucursal/pedido se heredan de él en el backend, no
 * hay nada más que capturar (ver `PackingWizardStep1`). El encabezado propio
 * de packing (`numero_cajas`/`peso_total`/`volumen_total`/`observaciones`)
 * vive en el Paso 2, junto con las cantidades por línea — mismo paso, porque
 * ambos dependen de los datos del picking elegido cargados ahí.
 *
 * `fecha_inicio`/`fecha_fin` existen en el contrato de creación
 * (`CreatePackingPayload`) pero, igual que `fecha_limite` en picking, el
 * formulario actual no los captura — no forman parte de este schema.
 */

/** Paso 1: solo el picking origen. `0` = sin seleccionar. */
export const PackingStep1Schema = z.object({
  picking: z.number().int().min(1, "Selecciona un surtido"),
});
export type PackingStep1Values = z.infer<typeof PackingStep1Schema>;

/** Cantidad mínima aceptada por línea en el backend (`min_value=0.0001`). */
export const PACKING_MIN_CANTIDAD = 0.0001;

/**
 * Encabezado propio de packing, capturado en el Paso 2 — todos los campos son
 * opcionales en el backend (`numero_cajas`/`peso_total`/`volumen_total` tienen
 * default `0`, `observaciones` admite `blank`/`null`). `peso_total`/
 * `volumen_total` viajan como STRING decimal (mismo criterio que el resto del
 * contrato), no como `number` — evita el redondeo binario de punto flotante
 * en valores con hasta 3 decimales.
 */
/** `decimal_places=3` de `peso_total`/`volumen_total` en el backend. */
export const PACKING_HEADER_DECIMAL_PLACES = 3;

/**
 * Un decimal de encabezado: vacío (opcional no capturado) o un número
 * enviable. El input ya lo sanea al teclear, pero esto es lo que cierra el
 * paso en el ENVÍO — el saneo de un input es una comodidad de captura, no una
 * garantía de validez (un valor pegado, o un cambio futuro del sanitizer,
 * llegarían igual al POST sin esta comprobación).
 *
 * El input conserva un `-` inicial (`keepLeadingMinus`) para que un negativo
 * se rechace aquí con un error en vez de convertirse en positivo en silencio;
 * el backend no pone mínimo a estos campos, así que este es el único freno.
 */
const headerDecimal = (label: string) =>
  z
    .string()
    .refine(
      (value) =>
        value.trim() === "" || toSendableDecimal(value, PACKING_HEADER_DECIMAL_PLACES) !== null,
      { message: `${label} debe ser un número válido` },
    )
    .refine((value) => value.trim() === "" || !(Number(value) < 0), {
      message: `${label} debe ser mayor o igual a 0`,
    });

/**
 * Número de cajas: se captura como TEXTO tal cual se teclea (sin truncar
 * decimales ni quitar el signo) y esta regla rechaza lo que no sea un entero
 * mayor o igual a 0 —mismo criterio que `dias_credito` en clientes—. Vacío
 * equivale a 0. La salida ya es el entero que se envía.
 */
const numeroCajas = z
  .string()
  .refine((value) => value.trim() === "" || /^-?\d+$/.test(value.trim()), {
    message: "El número de cajas debe ser un número entero",
  })
  .refine((value) => !/^-\d+$/.test(value.trim()), {
    message: "El número de cajas debe ser mayor o igual a 0",
  })
  .transform((value) => (value.trim() === "" ? 0 : Number(value.trim())));

export const PackingHeaderSchema = z.object({
  numero_cajas: numeroCajas,
  peso_total: headerDecimal("El peso total"),
  volumen_total: headerDecimal("El volumen total"),
  observaciones: z.string(),
});
/** Lo capturado en el formulario (`numero_cajas` como texto). */
export type PackingHeaderValues = z.input<typeof PackingHeaderSchema>;
/** Lo ya validado, listo para armar el body (`numero_cajas` como entero). */
export type PackingHeaderData = z.output<typeof PackingHeaderSchema>;

/** Valores iniciales del encabezado del Paso 2 — sin cajas/peso/volumen capturados aún. */
export const createEmptyPackingHeaderValues = (): PackingHeaderValues => ({
  numero_cajas: "",
  peso_total: "",
  volumen_total: "",
  observaciones: "",
});
