import { expect, test } from "@playwright/test";
import { deriveMultiPickerSelection } from "@/src/components/multiSelectPickerSelection";

/**
 * EC-928: la selección de `MultiSelectPickerDialogContent`. Un ítem marcado que
 * una relectura deshabilita se pinta sin marcar (y sin fijar arriba), no cuenta
 * y no se confirma. Sin `getItemDisabledReason`, todo sigue como antes.
 */

interface Item {
  id: number;
  disabled?: boolean;
}

const getKey = (item: Item) => item.id;
const getItemDisabledReason = (item: Item) => (item.disabled ? "No admite cobros." : null);

test("marcado y luego deshabilitado: sin marcar, contador 0 y fuera de la confirmación", () => {
  const tentativeKeys = new Set([2]);
  const before = deriveMultiPickerSelection({
    items: [{ id: 1 }, { id: 2 }],
    tentativeKeys,
    getKey,
    getItemDisabledReason,
    isListReplaced: false,
  });
  expect(before.isTicked({ id: 2 })).toBe(true);
  expect(before.selectedCount).toBe(1);
  expect(before.confirmable).toEqual([{ id: 2 }]);

  // La relectura trae el mismo ítem deshabilitado.
  const after = deriveMultiPickerSelection({
    items: [{ id: 1 }, { id: 2, disabled: true }],
    tentativeKeys,
    getKey,
    getItemDisabledReason,
    isListReplaced: false,
  });
  expect(after.isTicked({ id: 2, disabled: true })).toBe(false);
  expect(after.selectedCount).toBe(0);
  expect(after.confirmable).toEqual([]);
});

test("si vuelve a habilitarse, vuelve marcado (la clave se conserva)", () => {
  const selection = deriveMultiPickerSelection({
    items: [{ id: 2 }],
    tentativeKeys: new Set([2]),
    getKey,
    getItemDisabledReason,
    isListReplaced: false,
  });
  expect(selection.isTicked({ id: 2 })).toBe(true);
  expect(selection.selectedCount).toBe(1);
});

test("sin getItemDisabledReason: el comportamiento de siempre", () => {
  const selection = deriveMultiPickerSelection({
    items: [{ id: 1, disabled: true }, { id: 2 }, { id: 3 }],
    tentativeKeys: new Set([3, 1, 9]),
    getKey,
    isListReplaced: false,
  });
  expect(selection.isTicked({ id: 1, disabled: true })).toBe(true);
  // 9 ya no está en la lista: no cuenta. Se confirma en el orden de la lista.
  expect(selection.selectedCount).toBe(2);
  expect(selection.confirmable.map(getKey)).toEqual([1, 3]);
});

test("con la lista sustituida (cargando o con error) cuenta el conjunto tal cual", () => {
  const selection = deriveMultiPickerSelection({
    items: [],
    tentativeKeys: new Set([1, 2]),
    getKey,
    getItemDisabledReason,
    isListReplaced: true,
  });
  expect(selection.selectedCount).toBe(2);
  expect(selection.confirmable).toEqual([]);
});
