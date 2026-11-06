/**
 * Almacén destino y dirección de entrega de la orden de compra (EC-796).
 *
 * Funciones puras que comparten el alta, la edición, el detalle, el PDF, el
 * correo y la recepción, para que todos apliquen la misma regla.
 */

/** Texto del PDF y del correo cuando la sucursal no tiene dirección capturada. */
export const NO_DELIVERY_ADDRESS = "Dirección de entrega no capturada";

/**
 * Texto opcional del backend normalizado: `""` o solo espacios cuentan como
 * ausente. El teléfono de la sucursal llega `""` cuando no se capturó.
 */
export const optionalText = (value: string | null | undefined): string | null =>
  value?.trim() || null;

/**
 * Almacenes que se pueden elegir para una sucursal: SOLO los suyos. Los que no
 * tienen sucursal (`sucursal_id: null`) se excluyen a propósito: la OC los
 * acepta, pero la recepción los rechaza, así que preseleccionarlos acabaría en
 * un 400 al recibir. Sin sucursal elegida (`0`) no hay ninguno.
 */
export const almacenesDeSucursal = <T extends { sucursal_id: number | null }>(
  almacenes: readonly T[],
  sucursalId: number | null | undefined,
): T[] =>
  sucursalId ? almacenes.filter((almacen) => almacen.sucursal_id === sucursalId) : [];

/**
 * Parte del body del PUT que lleva el almacén: SOLO si cambió respecto de la
 * orden cargada. El formulario usa `0` para "sin almacén", que viaja como
 * `null` (nunca `0`: el backend se salta la validación y revienta al
 * guardarlo). Reenviar el almacén sin cambios se evita porque, si quedó
 * inactivo, el backend rechaza el PUT completo.
 */
export const almacenPutPatch = (
  formAlmacen: number,
  loadedAlmacen: number | null,
): { almacen?: number | null } => {
  const next = formAlmacen > 0 ? formAlmacen : null;
  return next === (loadedAlmacen ?? null) ? {} : { almacen: next };
};

/**
 * Almacén que la recepción preselecciona: el de la OC, solo si está entre los
 * que el selector ofrece (los de la sucursal de la OC). Si no, `0`
 * ("Seleccionar…"): inactivo, sin sucursal o de otra sucursal no se sugiere.
 */
export const almacenPreseleccionado = (
  almacenId: number | null | undefined,
  opciones: readonly { id_almacen: number }[],
): number =>
  almacenId && opciones.some((almacen) => almacen.id_almacen === almacenId) ? almacenId : 0;

export interface AlmacenSelectOption {
  value: number;
  label: string;
}

/**
 * Opciones del selector de almacén destino de la OC para la sucursal elegida
 * (`codigo — nombre`). Sin sucursal o sin almacenes en ella, el selector queda
 * deshabilitado con un aviso en lugar de las opciones.
 *
 * `selected` (solo en la edición) es el almacén ya guardado en la orden:
 * si no está entre las opciones (quedó inactivo, no tiene sucursal o es de
 * otra), se agrega para que el selector siga mostrando el valor real.
 */
export const almacenSelectState = ({
  almacenes,
  sucursalId,
  emptyLabel,
  selected,
}: {
  almacenes: readonly { id_almacen: number; codigo: string; nombre: string; sucursal_id: number | null }[];
  sucursalId: number | null | undefined;
  /** Etiqueta de la opción `0`: "Seleccionar…" en el alta, "Sin almacén" en la edición. */
  emptyLabel: string;
  selected?: AlmacenSelectOption | null;
}): { options: AlmacenSelectOption[]; disabled: boolean } => {
  const own = almacenesDeSucursal(almacenes, sucursalId).map((almacen) => ({
    value: almacen.id_almacen,
    label: `${almacen.codigo} — ${almacen.nombre}`,
  }));
  const extra =
    selected && selected.value > 0 && !own.some((option) => option.value === selected.value)
      ? [selected]
      : [];
  if (own.length === 0 && extra.length === 0) {
    return {
      options: [
        {
          value: 0,
          label: sucursalId
            ? "No hay almacenes activos en esta sucursal"
            : "Elige primero una sucursal",
        },
      ],
      disabled: true,
    };
  }
  return { options: [{ value: 0, label: emptyLabel }, ...own, ...extra], disabled: false };
};

/**
 * Almacén que queda al cambiar la sucursal del encabezado (`0` = ninguno). El
 * almacén es de UNA sucursal, así que se suelta; pero si la sucursal vuelve a
 * la de la orden cargada (`loaded`, solo en la edición), regresa el almacén
 * guardado: A → B → A no debe quitarle el destino a la orden en silencio.
 */
export const almacenTrasCambioDeSucursal = (
  nextSucursal: number,
  loaded?: { sucursal: number; almacen: number | null } | null,
): number => (loaded && nextSucursal === loaded.sucursal ? (loaded.almacen ?? 0) : 0);
