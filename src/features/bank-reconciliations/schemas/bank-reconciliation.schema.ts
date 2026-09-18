import { z } from "zod";
import {
  MONEY_REGEX,
  toCents,
} from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";

/**
 * Esquema del formulario de PREPARAR una conciliación bancaria y aritmética del
 * cuadre.
 *
 * `MONEY_REGEX`/`toCents` se reutilizan de CxC en vez de reescribirse: son la
 * fuente de verdad del proyecto para dinero de 2 decimales y comparación en
 * centavos enteros, y es de donde los toma también el formulario de pólizas.
 */

/**
 * El saldo del estado de cuenta puede ser NEGATIVO: una cuenta sobregirada lo
 * es, y el backend lo acepta (`DecimalField`, sin `min_value`).
 *
 * `MONEY_REGEX` solo describe la MAGNITUD (`^\d+(\.\d{1,2})?$`), así que en vez
 * de reescribirla —es compartida con CxC y pólizas— se le antepone un signo
 * opcional y se delega en ella el resto. `toCents` ya maneja el negativo:
 * `Math.round(Number("-5.00") * 100)`.
 */
export const esImporteConSignoValido = (value: string): boolean => {
  const magnitud = value.startsWith("-") ? value.slice(1) : value;
  return MONEY_REGEX.test(magnitud);
};

/**
 * Tolerancia del cuadre, en CENTAVOS ENTEROS.
 *
 * Espejo exacto del `abs(diferencia) > Decimal("0.01")` que aplica
 * `ConciliacionService.cerrar_conciliacion`: un centavo. Se compara en enteros
 * —no en flotantes— por el mismo motivo que en pólizas: `0.1 + 0.2 !== 0.3` y
 * una pantalla que dijera "no cuadra" sobre una conciliación que el backend
 * cerraría sin problema dejaría al usuario sin saber por qué.
 */
export const CUADRE_TOLERANCIA_CENTAVOS = 1;

/** Centavos enteros → string decimal de 2 posiciones ("-11600" → "-116.00"). */
export const centavosAMoneda = (cents: number): string => (cents / 100).toFixed(2);

/**
 * Diferencia de la conciliación en CENTAVOS ENTEROS
 * (`saldo_estado_cuenta - saldo_libros`).
 *
 * Se recalcula en el cliente en vez de leer el `diferencia` que ya manda el
 * serializer: es el mismo número, pero calculado aquí sirve también al
 * formulario, donde el saldo capturado todavía no ha viajado al servidor.
 */
export const diferenciaEnCentavos = (
  saldoEstadoCuenta: string,
  saldoLibros: string,
): number => toCents(saldoEstadoCuenta) - toCents(saldoLibros);

/**
 * ¿Cuadra la conciliación? Espejo de la condición que `cerrar` exige.
 */
export const conciliacionCuadra = (
  saldoEstadoCuenta: string,
  saldoLibros: string,
): boolean =>
  Math.abs(diferenciaEnCentavos(saldoEstadoCuenta, saldoLibros)) <=
  CUADRE_TOLERANCIA_CENTAVOS;

/**
 * Mensaje único de "no se puede cerrar sin cuadrar", para el camino en que la
 * conciliación ya está guardada y la acción sale del listado. Mismo criterio
 * que `POLIZA_DESCUADRADA_MESSAGE`.
 */
export const CONCILIACION_DESCUADRADA_MESSAGE =
  "La conciliación no cuadra: el saldo del estado de cuenta debe coincidir con el saldo en libros para cerrarla.";

/**
 * Validación del formulario de preparar.
 *
 * Las dos fechas se EXIGEN aquí aunque el backend las acepte nulas: sin
 * `fecha_final` el backend toma el saldo vivo de la cuenta en vez de
 * reconstruirlo a una fecha de corte, y una conciliación sin periodo no se
 * puede contrastar contra un estado de cuenta. Además, una fila con
 * `fecha_final` nula escaparía al filtro de solapamiento que protege de
 * re-preparar un periodo ya cerrado.
 */
export const PrepararConciliacionFormSchema = z
  .object({
    // `0` es el centinela de la opción "Seleccionar..." del select.
    cuenta_bancaria: z
      .number()
      .int("La cuenta bancaria es inválida")
      .positive("La cuenta bancaria es requerida"),
    fecha_inicio: z.string().min(1, "La fecha inicial es requerida"),
    fecha_final: z.string().min(1, "La fecha final es requerida"),
    saldo_estado_cuenta: z
      .string()
      .min(1, "El saldo del estado de cuenta es requerido")
      .refine(esImporteConSignoValido, "Usa un importe con hasta 2 decimales"),
  })
  // Misma regla que `ConciliacionService.preparar_conciliacion`, para avisar
  // antes del viaje en vez de traducir su 400.
  .refine((values) => values.fecha_inicio <= values.fecha_final, {
    message: "La fecha inicial no puede ser mayor a la final",
    path: ["fecha_inicio"],
  });

export type PrepararConciliacionFormValues = z.infer<
  typeof PrepararConciliacionFormSchema
>;

/** Valores iniciales. El saldo arranca vacío: es un dato que se copia del estado de cuenta. */
export const createEmptyPrepararConciliacionForm =
  (): PrepararConciliacionFormValues => ({
    cuenta_bancaria: 0,
    fecha_inicio: "",
    fecha_final: "",
    saldo_estado_cuenta: "",
  });
