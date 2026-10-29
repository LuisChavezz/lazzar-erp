import { expect, test } from "@playwright/test";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { getVisibleActionItems } from "@/src/utils/actionMenuVisibility";

/**
 * Pruebas unitarias de EC-635: la regla de visibilidad de `ActionMenu`. Si no
 * deja ningún item, el menú cae a su `renderWhenEmpty` (el nombre de la fila
 * como texto plano en el modo nombre de `FolioActionMenu`).
 */

const Icon = () => null;
const item = (label: string, extra: Partial<ActionMenuItem> = {}): ActionMenuItem => ({ label, icon: Icon, ...extra });

const rh = { role: "user", permissions: ["R-RH", "E-RH"] };

test.describe("getVisibleActionItems", () => {
  test("sin `visible` ni `permission` el item se ve; `visible: false` lo oculta", () => {
    const visible = getVisibleActionItems([item("Editar"), item("Desactivar", { visible: false })], rh);
    expect(visible.map((i) => i.label)).toEqual(["Editar"]);
  });

  test("con `permission`, solo si el usuario la tiene (o es admin)", () => {
    const items = [item("Editar", { permission: "E-RH" }), item("Borrar", { permission: "D-RH" })];
    expect(getVisibleActionItems(items, rh).map((i) => i.label)).toEqual(["Editar"]);
    expect(getVisibleActionItems(items, { role: "admin", permissions: [] })).toHaveLength(2);
    expect(getVisibleActionItems(items, null)).toEqual([]);
  });

  test("usuario de solo lectura en un catálogo sin \"Ver detalle\": no queda ningún item", () => {
    const items = [
      item("Editar", { visible: false }),
      item("Desactivar", { visible: false }),
      item("Reactivar", { permission: "D-RH" }),
    ];
    expect(getVisibleActionItems(items, rh)).toEqual([]);
  });

  test("sin items no hay nada visible", () => {
    expect(getVisibleActionItems([], rh)).toEqual([]);
  });
});
