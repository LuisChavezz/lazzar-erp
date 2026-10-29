import { expect, test } from "@playwright/test";
import { getSinSucursalMessage } from "@/src/features/workspace/utils/workspaceBranchMessages";
import {
  getQuoteSinSucursalMessage,
  QUOTE_SUCURSAL_LOADING_MESSAGE,
} from "@/src/features/quotes/utils/quoteSucursal";

/**
 * Pruebas unitarias de EC-623: el aviso de alta sin sucursal es compartido. La
 * cotización debe seguir mostrando EXACTAMENTE los textos de EC-622.
 */
test.describe("getSinSucursalMessage", () => {
  test("la cotización conserva sus textos", () => {
    expect(getQuoteSinSucursalMessage(false)).toBe(
      "Tu espacio de trabajo no tiene una sucursal válida. Selecciona una sucursal en el encabezado para guardar la cotización.",
    );
    expect(getQuoteSinSucursalMessage(true)).toBe(
      "No se pudieron cargar tus sucursales para asignarla a la cotización. Recarga la página e inténtalo de nuevo.",
    );
    expect(QUOTE_SUCURSAL_LOADING_MESSAGE).toBe(
      "Aún se están cargando tus sucursales. Intenta guardar de nuevo en un momento.",
    );
  });

  test("arma la frase con el documento de cada alta", () => {
    const documento = { asignarA: "al empleado", guardar: "el empleado" };
    expect(getSinSucursalMessage(false, documento)).toContain("para guardar el empleado.");
    expect(getSinSucursalMessage(true, documento)).toContain("para asignarla al empleado.");
  });
});
