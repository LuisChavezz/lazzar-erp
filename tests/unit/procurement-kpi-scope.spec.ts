import { expect, test } from "@playwright/test";
import { AxiosError, type AxiosResponse } from "axios";
import { isAmountOnlyKpiHidden } from "@/src/features/purchase-orders/utils/purchaseOrderKpis";
import { onboardingLoadErrorMessage } from "@/src/features/purchase-orders/utils/onboardingLoadError";
import { isClientError } from "@/src/utils/drfWriteErrors";

/**
 * Pruebas unitarias de EC-718: `puede_ver_importes` llega `false` también sin
 * empresa (backend #860), y los onboardings de compras rechazan a un usuario
 * sin empresa con `400 {"empresa": "<string>"}` (backend #862).
 */
const axiosError = (status: number, data: unknown) =>
  new AxiosError("Request failed with status code " + status, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

test.describe("isAmountOnlyKpiHidden", () => {
  test("sin permiso la tarjeta de solo importe dice No visible", () => {
    expect(isAmountOnlyKpiHidden(false, false)).toBe(true);
  });

  test("sin empresa conserva el motivo del bloque aunque la bandera sea false", () => {
    expect(isAmountOnlyKpiHidden(false, true)).toBe(false);
  });

  test("con permiso se muestran los importes", () => {
    expect(isAmountOnlyKpiHidden(true, false)).toBe(false);
  });

  test("una bandera ausente no muestra importes", () => {
    expect(isAmountOnlyKpiHidden(undefined, false)).toBe(true);
  });
});

test.describe("onboardingLoadErrorMessage", () => {
  test("muestra el mensaje de empresa del 400 tal cual (string plano)", () => {
    const error = axiosError(400, { empresa: "El usuario no tiene empresa asignada." });
    expect(onboardingLoadErrorMessage(error)).toBe("El usuario no tiene empresa asignada.");
  });

  test("también lee la forma de lista de DRF", () => {
    const error = axiosError(400, { empresa: ["El usuario no tiene empresa asignada."] });
    expect(onboardingLoadErrorMessage(error)).toBe("El usuario no tiene empresa asignada.");
  });

  test("un 500 sin mensaje nunca muestra el texto técnico de axios", () => {
    expect(onboardingLoadErrorMessage(axiosError(500, "<html>"))).toBe("Intenta de nuevo en unos momentos.");
  });
});

test.describe("isClientError", () => {
  test("solo los 4xx", () => {
    expect(isClientError(axiosError(400, {}))).toBe(true);
    expect(isClientError(axiosError(404, {}))).toBe(true);
    expect(isClientError(axiosError(500, {}))).toBe(false);
    expect(isClientError(new Error("red"))).toBe(false);
  });
});
