import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE,
  PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE,
  PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
  purchaseOrderCriticalPathSaveErrorMessage,
} from "@/src/features/purchase-orders/utils/purchaseOrderCriticalPathErrors";
import type { PurchaseOrderCriticalPathField } from "@/src/features/purchase-orders/schemas/purchase-order-critical-path.schema";
import { submitPurchaseOrderCriticalPath } from "@/src/features/purchase-orders/utils/purchaseOrderCriticalPathForm";

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

test("un 403 sin detail pero con llaves de campo no pinta campos ni muestra su valor", () => {
  const { errors, set } = collectFieldErrors();
  expect(
    purchaseOrderCriticalPathSaveErrorMessage(axiosError(403, { comentarios: ["x"] }), set),
  ).toBe(PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE);
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

test("el respaldo del 403 usa la misma redacción que el backend", () => {
  expect(PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE).toBe(
    "No tienes permiso para editar la ruta crítica de la orden de compra.",
  );
});

// Cableado del guardado (`submitPurchaseOrderCriticalPath`, el `onSubmit` del
// formulario): solo un 403 pasa el diálogo a solo lectura.
const submitWith = async (outcome: () => Promise<unknown>) => {
  let forbiddenCalls = 0;
  await submitPurchaseOrderCriticalPath(outcome, () => {
    forbiddenCalls += 1;
  });
  return forbiddenCalls;
};

test("un 403 al guardar llama a onForbidden y no rechaza", async () => {
  expect(
    await submitWith(() =>
      Promise.reject(
        axiosError(403, { detail: "No tienes permiso para editar la ruta crítica de la orden de compra." }),
      ),
    ),
  ).toBe(1);
  expect(await submitWith(() => Promise.reject(axiosError(403)))).toBe(1);
});

test("400, 404, 500, red y éxito no llaman a onForbidden", async () => {
  expect(await submitWith(() => Promise.reject(axiosError(400, { comentarios: ["x"] })))).toBe(0);
  expect(await submitWith(() => Promise.reject(axiosError(404)))).toBe(0);
  expect(await submitWith(() => Promise.reject(axiosError(500)))).toBe(0);
  expect(await submitWith(() => Promise.reject(new AxiosError("Network Error", "ERR_NETWORK")))).toBe(0);
  expect(await submitWith(() => Promise.resolve({}))).toBe(0);
});

test("sin onForbidden, un 403 tampoco rechaza", async () => {
  await expect(submitPurchaseOrderCriticalPath(() => Promise.reject(axiosError(403)))).resolves.toBeUndefined();
});
