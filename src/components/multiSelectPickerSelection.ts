/**
 * Selección de `MultiSelectPickerDialogContent`, derivada del conjunto
 * tentativo (las claves que el usuario marcó) y de la lista vigente. Pura, para
 * probarla sin montar el diálogo; el componente la usa para pintar cada casilla
 * (`isTicked`), el contador (`selectedCount`) y lo que confirma (`confirmable`).
 *
 * - Lo que CUENTA como seleccionado: con la lista ya cargada, solo las claves
 *   que siguen en `items` (una relectura puede quitar un ítem ya marcado); sin
 *   esto el contador lo seguiría contando y "Confirmar" quedaría habilitado sin
 *   nada que confirmar. Con la lista sustituida (`isListReplaced`: cargando o
 *   con error) se usa el conjunto tal cual.
 * - Un ítem deshabilitado (`getItemDisabledReason`) no cuenta, no se confirma y
 *   se pinta SIN marcar (y por tanto sin fijar arriba): su fila ignora el clic,
 *   así que marcado no se podría desmarcar. Su clave se conserva, igual que la
 *   de un ítem que sale de la lista: si vuelve a habilitarse, vuelve marcado.
 */
export const deriveMultiPickerSelection = <T>({
  items,
  tentativeKeys,
  getKey,
  getItemDisabledReason,
  isListReplaced,
}: {
  items: readonly T[];
  tentativeKeys: ReadonlySet<string | number>;
  getKey: (item: T) => string | number;
  getItemDisabledReason?: (item: T) => string | null;
  isListReplaced: boolean;
}) => {
  const isEnabled = (item: T) => (getItemDisabledReason?.(item) ?? null) === null;
  const isTicked = (item: T) => tentativeKeys.has(getKey(item)) && isEnabled(item);
  const listedKeys = new Set(items.filter(isEnabled).map(getKey));
  const selectedCount = isListReplaced
    ? tentativeKeys.size
    : [...tentativeKeys].filter((key) => listedKeys.has(key)).length;
  return {
    isTicked,
    selectedCount,
    /** Lo que se confirma, en el ORDEN de la lista (no en el de marcado). */
    confirmable: items.filter(isTicked),
  };
};
