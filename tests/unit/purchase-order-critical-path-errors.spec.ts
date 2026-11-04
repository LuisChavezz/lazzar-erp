import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE,
  PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE,
  PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
  purchaseOrderCriticalPathSaveErrorMessage,
} from "@/src/features/purchase-orders/utils/purchaseOrderCriticalPathErrors";
import type { PurchaseOrderCriticalPathField } from "@/src/features/purchase-orders/schemas/purchase-order-critical-path.schema";

/**
 * Pruebas unitarias de EC-770: el toast de un PATCH fallido de la ruta crítica
 * de la OC. Un 403 (sin `E-COMPRAS-OC`) ya no cae al texto genérico; 400, 404
 * y el resto conservan su manejo. Corren con `npm run test:unit`.
 */

const axiosError = (status: number, data?: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const collectFieldErrors = () => {
  const errors: Partial<Record<PurchaseOrderCriticalPathField, string>> = {};
  const set = (field: PurchaseOrderCriticalPathField, message: string) => {
    errors[field] = message;
  };
  return { errors, set };
};

test("un 403 muestra el detail real del backend", () => {
  // Cuerpo real del PATCH sin `E-COMPRAS-OC` (nucleo-erp 5b58c05).
  const error = axiosError(403, {
    detail: "No tienes permiso para editar la ruta crítica de la orden de compra.",
  });
  expect(purchaseOrderCriticalPathSaveErrorMessage(error)).toBe(
    "No tienes permiso para editar la ruta crítica de la orden de compra.",
  );
});

test("un 403 sin detail muestra el texto fijo de permiso, no el genérico", () => {
  expect(purchaseOrderCriticalPathSaveErrorMessage(axiosError(403))).toBe(
    PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE,
  );
  expect(purchaseOrderCriticalPathSaveErrorMessage(axiosError(403, "<html>Forbidden</html>"))).toBe(
    PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE,
  );
});

test("un 403 no pinta errores de campo", () => {
  const { errors, set } = collectFieldErrors();
  purchaseOrderCriticalPathSaveErrorMessage(axiosError(403, { comentarios: ["x"] }), set);
  expect(errors).toEqual({});
});

test("un 400 sigue pintando cada error bajo su campo", () => {
  const { errors, set } = collectFieldErrors();
  const message = purchaseOrderCriticalPathSaveErrorMessage(
    axiosError(400, {
      fecha_real_recibo: ["Formato de fecha inválido."],
      comentarios: ["Asegúrese de que este campo no tenga más de 2000 caracteres."],
    }),
    set,
  );
  expect(errors).toEqual({
    fecha_real_recibo: "Formato de fecha inválido.",
    comentarios: "Asegúrese de que este campo no tenga más de 2000 caracteres.",
  });
  expect(message).toBe(PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK);
});

test("un 400 de un campo que el formulario no muestra llega al toast", () => {
  const { errors, set } = collectFieldErrors();
  expect(
    purchaseOrderCriticalPathSaveErrorMessage(axiosError(400, { oc: ["Inválido."] }), set),
  ).toBe("Inválido.");
  expect(errors).toEqual({});
});

test("un 404 dice que la OC no se encontró", () => {
  expect(
    purchaseOrderCriticalPathSaveErrorMessage(axiosError(404, { detail: "Orden de compra no encontrada." })),
  ).toBe(PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE);
});

test("red, 5xx y otros estados caen al texto genérico", () => {
  expect(purchaseOrderCriticalPathSaveErrorMessage(axiosError(500, { detail: "Server Error" }))).toBe(
    PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
  );
  expect(purchaseOrderCriticalPathSaveErrorMessage(axiosError(409, { detail: "Conflicto" }))).toBe(
    PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
  );
  expect(purchaseOrderCriticalPathSaveErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(
    PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
  );
  expect(purchaseOrderCriticalPathSaveErrorMessage(new Error("boom"))).toBe(
    PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
  );
});
