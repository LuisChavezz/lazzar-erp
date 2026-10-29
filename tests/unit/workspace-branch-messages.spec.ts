import { expect, test } from "@playwright/test";
import {
  getSinSucursalLoadingMessage,
  getSinSucursalMessage,
  getSinSucursalTitle,
  WORKSPACE_BRANCH_LOADING_MESSAGE,
} from "@/src/features/workspace/utils/workspaceBranchMessages";
import { QUOTE_SUCURSAL_DOCUMENT } from "@/src/features/quotes/utils/quoteSucursal";

/**
 * Pruebas unitarias de EC-623: el aviso de alta sin sucursal es compartido. La
 * cotización debe seguir mostrando EXACTAMENTE los textos de EC-622.
 */
test.describe("getSinSucursalMessage", () => {
  test("la cotización conserva sus textos", () => {
    expect(getSinSucursalMessage(false, QUOTE_SUCURSAL_DOCUMENT)).toBe(
      "Tu espacio de trabajo no tiene una sucursal válida. Selecciona una sucursal en el encabezado para guardar la cotización.",
    );
    expect(getSinSucursalMessage(true, QUOTE_SUCURSAL_DOCUMENT)).toBe(
      "No se pudieron cargar tus sucursales para asignarla a la cotización. Recarga la página e inténtalo de nuevo.",
    );
    expect(WORKSPACE_BRANCH_LOADING_MESSAGE).toBe(
      "Aún se están cargando tus sucursales. Intenta guardar de nuevo en un momento.",
    );
  });

  test("arma la frase con el documento de cada alta", () => {
    const documento = { asignarA: "al empleado", guardar: "el empleado" };
    expect(getSinSucursalMessage(false, documento)).toContain("para guardar el empleado.");
    expect(getSinSucursalMessage(true, documento)).toContain("para asignarla al empleado.");
  });
});

/** EC-636: la generación de nómina nombra su propia acción bloqueada. */
test.describe("verbo de la acción bloqueada", () => {
  test("sin verbo, los textos de siempre", () => {
    expect(getSinSucursalTitle()).toBe("No se puede guardar sin sucursal");
  });

  test("con verbo, título y mensaje dicen esa acción", () => {
    const documento = { asignarA: "a la quincena", guardar: "la quincena" };
    expect(getSinSucursalTitle("generar")).toBe("No se puede generar sin sucursal");
    expect(getSinSucursalMessage(false, documento, "generar")).toBe(
      "Tu espacio de trabajo no tiene una sucursal válida. Selecciona una sucursal en el encabezado para generar la quincena.",
    );
  });
});

test.describe("getSinSucursalLoadingMessage", () => {
  test("por defecto es el texto de siempre", () => {
    expect(getSinSucursalLoadingMessage()).toBe(WORKSPACE_BRANCH_LOADING_MESSAGE);
    expect(getSinSucursalLoadingMessage()).toBe(
      "Aún se están cargando tus sucursales. Intenta guardar de nuevo en un momento.",
    );
  });

  test("nombra la acción bloqueada", () => {
    expect(getSinSucursalLoadingMessage("generar")).toBe(
      "Aún se están cargando tus sucursales. Intenta generar de nuevo en un momento.",
    );
  });
});
