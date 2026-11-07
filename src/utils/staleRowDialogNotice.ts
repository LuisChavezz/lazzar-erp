/** Aviso de un diálogo de fila que se cerró por un cambio externo. */
export interface StaleRowDialogNotice {
  /** `id` del toast: estable, para que un doble render no lo duplique. */
  key: string;
  message: string;
}

/**
 * Textos del aviso, propios de cada catálogo (concuerdan en género: "el área
 * ya está inactiva", "el puesto ya está inactivo").
 */
export interface StaleRowDialogMessages {
  /** El registro ya no está en el listado. */
  gone: string;
  /** El registro cambió de `activo` mientras su diálogo estaba abierto. */
  activoChanged?: (activo: boolean) => string;
}

interface StaleRowDialogBase {
  /** Prefijo de la `key` del toast (`"area"`, `"contract"`…). */
  resource: string;
  targetId: number | null;
  isBusy: boolean;
}

/** Con baja lógica: la fila TIENE `activo` y la acción espera un valor. */
interface StaleActivoRowDialogArgs extends StaleRowDialogBase {
  target: { activo: boolean } | null;
  expectedActivo: boolean;
  messages: Required<StaleRowDialogMessages>;
}

/**
 * Sin baja lógica (calendarios): solo cuenta que el registro desaparezca.
 * Prohíbe `statusField`/`expectedEstado`: si no, un objeto de argumentos
 * pasado como VARIABLE (sin chequeo de propiedades de más) caería en esta
 * firma y se saltaría la comparación del estado sin error de tipos.
 */
interface StaleGoneRowDialogArgs extends StaleRowDialogBase {
  target: object | null;
  expectedActivo?: undefined;
  statusField?: undefined;
  expectedEstado?: undefined;
  messages: StaleRowDialogMessages;
}

/**
 * Textos de un registro con estado de negocio (vacaciones, nóminas…). El
 * estado es texto en RH y Finanzas, y un entero en cotizaciones (`estatus`).
 */
export interface StaleEstadoRowDialogMessages<E extends string | number> {
  /** El registro ya no está en el listado. */
  gone: string;
  /** El registro cambió de `estado` mientras su diálogo estaba abierto. */
  estadoChanged: (estado: E) => string;
}

/**
 * Sin baja lógica pero con `estado` de negocio (aprobaciones, pagos): la
 * acción espera un estado concreto (`"pendiente"` para aprobar, o el estado
 * con que se abrió la confirmación). La firma pública acota `E` a texto; el
 * tipo admite también un entero para que la implementación comparta un solo
 * `estadoChanged(string | number)` con la variante de `statusField`, sin cast.
 */
interface StaleEstadoRowDialogArgs<E extends string | number> extends StaleRowDialogBase {
  target: { estado: E } | null;
  expectedEstado: E;
  expectedActivo?: undefined;
  /** Prohibido aquí: con `statusField` va la firma de `StaleStatusFieldRowDialogArgs`. */
  statusField?: undefined;
  messages: StaleEstadoRowDialogMessages<E>;
}

/**
 * Igual que `StaleEstadoRowDialogArgs`, pero el estado vive en el campo que
 * nombra `statusField` (Finanzas y cotizaciones: `"estatus"`) en vez de
 * `estado`. Ese campo puede ser texto (Finanzas) o un entero (el `estatus` de
 * una cotización). El estado esperado y el de los textos se derivan de la
 * fila (`T[K]`): un campo renombrado o ausente falla el typecheck, como con
 * `estado`.
 */
interface StaleStatusFieldRowDialogArgs<
  T extends { [P in K]: string | number },
  K extends string,
>
  extends StaleRowDialogBase {
  statusField: K;
  target: T | null;
  expectedEstado: T[K];
  expectedActivo?: undefined;
  messages: StaleEstadoRowDialogMessages<T[K]>;
}

/**
 * ¿El diálogo de fila de `targetId` ya no aplica? Lo decide la vía rápida
 * contra la caché del listado: si el registro ya no está, o su `activo` ya no
 * es el que la acción necesita (`expectedActivo`: `true` para desactivar), el
 * diálogo se cierra con el aviso que devuelve. Sin `expectedActivo` (un
 * catálogo sin baja lógica, como calendarios) solo cuenta que el registro
 * desaparezca. Mientras la acción PROPIA está en vuelo (`isBusy`) no aplica: el
 * optimista cambia el registro al arrancar y el diálogo lo cierra el
 * `onSettled` de la mutación, sin aviso. `null` = el diálogo sigue.
 *
 * Tres firmas: con `expectedActivo`, la fila debe tipar `activo: boolean` y los
 * textos traer `activoChanged`, así que un `activo` renombrado o ausente no
 * apaga el aviso en silencio — falla el typecheck. Con `expectedEstado` (un
 * registro sin `activo` cuyo diálogo depende de su `estado`, como una
 * aprobación), lo mismo con `estado` y `estadoChanged`. Una cuarta firma
 * agrega `statusField` para leer el estado de otro campo (el `estatus` de
 * Finanzas); sin él se lee `estado`, así que las llamadas de RH no cambian.
 */
export function getStaleRowDialogNotice(args: StaleActivoRowDialogArgs): StaleRowDialogNotice | null;
export function getStaleRowDialogNotice(args: StaleGoneRowDialogArgs): StaleRowDialogNotice | null;
export function getStaleRowDialogNotice<E extends string>(
  args: StaleEstadoRowDialogArgs<E>
): StaleRowDialogNotice | null;
export function getStaleRowDialogNotice<
  T extends { [P in K]: string | number },
  K extends string,
>(args: StaleStatusFieldRowDialogArgs<T, K>): StaleRowDialogNotice | null;
export function getStaleRowDialogNotice(
  args:
    | StaleActivoRowDialogArgs
    | StaleGoneRowDialogArgs
    | StaleEstadoRowDialogArgs<string | number>
    | StaleStatusFieldRowDialogArgs<Record<string, string | number>, string>
): StaleRowDialogNotice | null {
  const { resource, targetId, target, isBusy, messages } = args;
  if (targetId === null || isBusy) return null;
  if (target === null) {
    return { key: `${resource}-stale-${targetId}-gone`, message: messages.gone };
  }
  if ("expectedEstado" in args && args.expectedEstado !== undefined) {
    // Sin `statusField` (la firma de `estado`) se lee `estado`.
    const field = args.statusField ?? "estado";
    const estado = (target as Record<string, string | number>)[field];
    if (estado === args.expectedEstado) return null;
    return {
      key: `${resource}-stale-${targetId}-${estado}`,
      message: args.messages.estadoChanged(estado),
    };
  }
  const { expectedActivo, messages: activoMessages } = args as
    | StaleActivoRowDialogArgs
    | StaleGoneRowDialogArgs;
  if (expectedActivo === undefined) return null;
  const { activo } = target as { activo: boolean };
  if (activo === expectedActivo || !activoMessages.activoChanged) return null;
  return {
    key: `${resource}-stale-${targetId}-${String(activo)}`,
    message: activoMessages.activoChanged(activo),
  };
}
