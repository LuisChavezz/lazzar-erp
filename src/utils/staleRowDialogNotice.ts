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
 * Misma regla que `getStaleEmployeeDialogNotice`, sin los textos fijos.
 */
export const getStaleRowDialogNotice = ({
  resource,
  targetId,
  target,
  expectedActivo,
  isBusy,
  messages,
}: {
  /** Prefijo de la `key` del toast (`"area"`, `"contract"`…). */
  resource: string;
  targetId: number | null;
  target: { activo?: boolean } | null;
  expectedActivo?: boolean;
  isBusy: boolean;
  messages: StaleRowDialogMessages;
}): StaleRowDialogNotice | null => {
  if (targetId === null || isBusy) return null;
  if (target === null) {
    return { key: `${resource}-stale-${targetId}-gone`, message: messages.gone };
  }
  if (expectedActivo === undefined || target.activo === undefined) return null;
  if (target.activo === expectedActivo || !messages.activoChanged) return null;
  return {
    key: `${resource}-stale-${targetId}-${String(target.activo)}`,
    message: messages.activoChanged(target.activo),
  };
};
