import type { PolizaFormValues } from "../schemas/poliza.schema";
import type {
  CreatePolizaDetallePayload,
  CreatePolizaPayload,
} from "../interfaces/poliza.interface";

/**
 * Convierte los valores del formulario al cuerpo exacto de
 * `POST /finanzas/polizas/`.
 *
 * Traducciones del formulario → contrato del API:
 *  - `estatus` viaja SIEMPRE como el literal `"Borrador"`, sin importar qué
 *    botón se pulsó. El `estatus_objetivo` de los valores del formulario NO se
 *    mapea a este campo: contabilizar es una ACCIÓN
 *    (`POST /{id}/contabilizar/`), nunca un valor escrito en el alta ni en un
 *    PATCH. Mandar `"Contabilizada"` aquí dejaría la póliza contabilizada sin
 *    pasar por `validar_suma_cero`, porque `perform_create` guarda el estatus
 *    tal cual lo recibe. Ver `CreatePolizaPayload` y `contabilizarPoliza`.
 *  - los ids de catálogo opcionales usan `0` como centinela de "sin
 *    seleccionar" y viajan como `null` (el backend los declara nullable). Aplica
 *    al `centro_costo` de la cabecera y al de cada movimiento.
 *  - los opcionales de texto vacíos viajan como `null`: `""` guardaría una
 *    cadena basura que se lee como dato existente pero en blanco.
 *  - `folio` se manda SIEMPRE (el esquema lo exige) en mayúsculas y sin
 *    espacios sobrantes, igual que el folio de la nota de crédito.
 *  - `cargo`/`abono` se normalizan a 2 decimales. Los dos lados viajan siempre,
 *    uno de ellos en `"0.00"`: el modelo los declara con `default=0`, así que
 *    omitir el lado vacío daría el mismo resultado, pero enviarlo explícito hace
 *    que el cuerpo refleje el asiento tal cual se capturó.
 *  - `orden` se deriva de la POSICIÓN del renglón (1-indexada), no se captura.
 *    En contabilidad el orden de los asientos no es cosmético (el cargo antecede
 *    a su abono) y es lo que las vistas de lectura usan para ordenar —ver
 *    `AccountsReceivablePolizasSection`—; sin él el backend guardaría `null` y
 *    el detalle quedaría a merced del orden de inserción.
 *
 * Nunca incluye:
 *  - `empresa` — la resuelve el servidor (`EmpresaResueltaEnServidorMixin` la
 *    declara de solo lectura para todo usuario no superusuario, y
 *    `perform_create` la pasa a `serializer.save()`).
 *  - `fecha` — es `auto_now_add`, de solo lectura: la fija el backend al crear.
 *  - `folio_consecutivo` y `usuario_creacion` — los llena el backend.
 *  - `activo` — su default (`True`) es el correcto y esta pantalla no da de baja.
 *  - los campos calculados (`total_cargos`, `total_abonos`, `cuadre_correcto`):
 *    la póliza NO tiene un total de cabecera, sus totales SE DERIVAN de los
 *    movimientos y no hay nada que enviar.
 *  - el FK padre dentro de cada renglón (`poliza` es de solo lectura en el
 *    serializer), ni los cinco FKs documentales de la línea (`factura`,
 *    `factura_proveedor`, `pago`, `cobro`, `movimiento_bancario`), que son de
 *    las pólizas que el backend genera solo.
 */
export function buildPolizaPayload(values: PolizaFormValues): CreatePolizaPayload {
  const optional = (raw: string, uppercase = false): string | null => {
    const trimmed = uppercase ? raw.trim().toUpperCase() : raw.trim();
    return trimmed ? trimmed : null;
  };

  /** `0` (centinela de "sin seleccionar") → `null`; cualquier otro id se manda. */
  const optionalFk = (id: number): number | null => (id > 0 ? id : null);

  const poliza_detalles: CreatePolizaDetallePayload[] = values.poliza_detalles.map(
    (line, index) => ({
      cuenta_contable: line.cuenta_contable,
      centro_costo: optionalFk(line.centro_costo),
      cargo: Number(line.cargo).toFixed(2),
      abono: Number(line.abono).toFixed(2),
      referencia: optional(line.referencia),
      observaciones: optional(line.observaciones),
      orden: index + 1,
    }),
  );

  return {
    sucursal: values.sucursal,
    centro_costo: optionalFk(values.centro_costo),
    folio: values.folio.trim().toUpperCase(),
    tipo: values.tipo,
    concepto: optional(values.concepto),
    // Literal, no derivado del formulario. Ver la nota de arriba.
    estatus: "Borrador",
    poliza_detalles,
  };
}
