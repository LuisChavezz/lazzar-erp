import { expect, test } from "@playwright/test";
// Primero el `window` falso: los stores hidratan al importarse.
import { storage, storageListeners, stored, writeFromOtherTab } from "./support/fakeBrowserStorage";
import * as workspace from "@/src/features/workspace/store/workspace.store";
import * as sat from "@/src/features/sat/stores/sat.store";

/**
 * EC-847: los stores persistidos ya no deshacen lo que otra pestaña escribe.
 * - workspace: no guarda `branchSwitching` (el loader atorado tras recargar) y
 *   se relee cuando otra pestaña escribe su clave (la limpieza al cambiar de
 *   empresa).
 * - sat: se relee igual, y cada guardado parte del mapa ACTUAL de
 *   `localStorage`, así que no borra la dirección que otra pestaña guardó para
 *   otra empresa.
 *
 * Sin navegador: ver `support/fakeBrowserStorage`.
 */

const branch = (id: number) => ({ id, codigo: `S-${id}`, nombre: `Sucursal ${id}` });
const address = (calle: string) => ({
  calle,
  numero_exterior: "1",
  colonia: "Centro",
  municipio: "Guadalajara",
  estado: "Jalisco",
  pais: "México",
  codigo_postal: "44100",
});

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

test("sat: la dirección que otra pestaña guarda llega a esta", () => {
  writeFromOtherTab("sat-storage", {
    state: { addressesByCompany: { "55": address("B") }, legacyAddress: null },
    version: 1,
  });
  expect(sat.useSatStore.getState().addressesByCompany["55"]?.calle).toBe("B");
});

test("sat: guardar parte del mapa actual y no borra la empresa que otra pestaña guardó", () => {
  // Otra pestaña guarda la empresa 3 y esta aún no se enteró (sin evento).
  storage.setItem(
    "sat-storage",
    JSON.stringify({
      state: { addressesByCompany: { "55": address("B"), "3": address("C") }, legacyAddress: null },
      version: 1,
    })
  );
  expect(sat.useSatStore.getState().addressesByCompany["3"]).toBeUndefined();
  sat.useSatStore.getState().setFiscalAddress(1, address("A"));
  const saved = stored("sat-storage").state.addressesByCompany;
  expect(Object.keys(saved).sort()).toEqual(["1", "3", "55"]);
  expect(sat.useSatStore.getState().addressesByCompany["3"]?.calle).toBe("C");
});

test("sat: reclamar la dirección anterior respeta un reclamo hecho en otra pestaña", () => {
  // Esta pestaña aún cree que hay una dirección pendiente; otra ya la reclamó.
  sat.useSatStore.setState({ legacyAddress: address("Legado") });
  // ...y otra pestaña la reclamó después, sin que esta se enterara aún.
  const current = stored("sat-storage");
  storage.setItem(
    "sat-storage",
    JSON.stringify({ ...current, state: { ...current.state, legacyAddress: null } })
  );
  sat.claimLegacyFiscalAddress(7);
  const saved = stored("sat-storage").state;
  expect(saved.addressesByCompany["7"]).toBeUndefined();
  expect(saved.legacyAddress).toBeNull();
});
