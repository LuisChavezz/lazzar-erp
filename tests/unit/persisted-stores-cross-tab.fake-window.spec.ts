import { expect, test } from "@playwright/test";
// Primero el `window` falso: los stores hidratan al importarse.
import { storage, storageListeners, stored, writeFromOtherTab } from "./support/fakeBrowserStorage";
import * as workspace from "@/src/features/workspace/store/workspace.store";

/**
 * EC-847: los stores persistidos ya no deshacen lo que otra pestaña escribe.
 * - workspace: no guarda `branchSwitching` (el loader atorado tras recargar) y
 *   se relee cuando otra pestaña escribe su clave (la limpieza al cambiar de
 *   empresa).
 *
 * Sin navegador: ver `support/fakeBrowserStorage`.
 */

const branch = (id: number) => ({ id, codigo: `S-${id}`, nombre: `Sucursal ${id}` });

test.describe.configure({ mode: "serial" });

test("workspace: la migración a v3 descarta el branchSwitching guardado", () => {
  const state = workspace.useWorkspaceStore.getState();
  expect(state.branchSwitching).toBe(false);
  expect(state.selectedBranch?.id).toBe(1);
});

test("workspace: partialize nunca guarda branchSwitching ni hasHydrated", () => {
  const { setBranch } = workspace.useWorkspaceStore.getState();
  setBranch(branch(2) as never); // de 1 a 2: cambio de sucursal, branchSwitching en memoria
  expect(workspace.useWorkspaceStore.getState().branchSwitching).toBe(true);
  const saved = stored("workspace-storage");
  expect(saved.version).toBe(3);
  expect(Object.keys(saved.state).sort()).toEqual(["companyLabel", "selectedBranch"]);
  expect(saved.state.selectedBranch.id).toBe(2);
});

test("workspace: la limpieza de otra pestaña llega a esta y su siguiente escritura no la deshace", () => {
  writeFromOtherTab("workspace-storage", { state: { selectedBranch: null, companyLabel: null }, version: 3 });
  expect(workspace.useWorkspaceStore.getState().selectedBranch).toBeNull();
  // Lo que antes reescribía la sucursal vieja: un set cualquiera en esta pestaña.
  workspace.useWorkspaceStore.getState().setCompanyLabel({ id: 55, name: "B", rfc: null });
  expect(stored("workspace-storage").state.selectedBranch).toBeNull();
});

test("workspace: una escritura de OTRA clave no relee el store", () => {
  workspace.useWorkspaceStore.getState().setBranch(branch(3) as never);
  storage.setItem("workspace-storage", JSON.stringify({ state: { selectedBranch: null }, version: 3 }));
  storageListeners.forEach((listener) => listener({ key: "theme-storage", storageArea: storage }));
  expect(workspace.useWorkspaceStore.getState().selectedBranch?.id).toBe(3);
});
