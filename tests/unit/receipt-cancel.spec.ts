import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  CancelReceiptFormSchema,
  RECEIPT_CANCEL_MOTIVO_MAX,
} from "@/src/features/receipts/schemas/receipt-cancel.schema";
import {
  RECEIPT_CANCEL_FALLBACK_MESSAGE,
  RECEIPT_CANCEL_NOT_FOUND_MESSAGE,
  classifyReceiptCancelError,
  receiptCancelErrorClosesDialog,
} from "@/src/features/receipts/utils/receiptCancelErrors";

/**
 * EC-925: el motivo de "Cancelar recepción" y qué se hace con cada error de
 * `POST /compras/recepciones/{id}/cancelar/` (nucleo-erp #1307/EC-926). Los 400
 * de este endpoint llegan con el valor como string plano, no como lista.
 * Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

test.describe("CancelReceiptFormSchema", () => {
  test("recorta el motivo y lo exige", () => {
    expect(CancelReceiptFormSchema.parse({ motivo: "  Captura duplicada \n" })).toEqual({
      motivo: "Captura duplicada",
    });
    for (const motivo of ["", "   ", "\n\t"]) {
      const result = CancelReceiptFormSchema.safeParse({ motivo });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("El motivo de cancelación es requerido.");
    }
  });

  test("admite hasta 500 caracteres (code points, como len() del backend), ya recortado", () => {
    expect(RECEIPT_CANCEL_MOTIVO_MAX).toBe(500);
    expect(CancelReceiptFormSchema.safeParse({ motivo: "a".repeat(500) }).success).toBe(true);
    // Los espacios de los extremos no cuentan, como en el backend.
    expect(CancelReceiptFormSchema.safeParse({ motivo: ` ${"a".repeat(500)} ` }).success).toBe(true);
    // 500 emojis son 1000 unidades UTF-16 pero 500 caracteres para el backend.
    expect(CancelReceiptFormSchema.safeParse({ motivo: "\u{1F600}".repeat(500) }).success).toBe(true);
    const largo = CancelReceiptFormSchema.safeParse({ motivo: "a".repeat(501) });
    expect(largo.success).toBe(false);
    expect(largo.error?.issues[0]?.message).toBe(
      "El motivo de cancelación admite a lo más 500 caracteres.",
    );
  });
});

test.describe("classifyReceiptCancelError", () => {
  test("400 motivo (string plano o lista) va bajo el campo y no cierra", () => {
    const msg = "El motivo de cancelación es requerido.";
    for (const data of [{ motivo: msg }, { motivo: [msg] }]) {
      const result = classifyReceiptCancelError(httpError(400, data));
      expect(result).toEqual({ kind: "motivo", message: msg });
      expect(receiptCancelErrorClosesDialog(result)).toBe(false);
    }
  });

  test("400 estatus, op y facturas_proveedores bloquean: mensaje tal cual y cierra", () => {
    const casos: Record<string, string> = {
      estatus: "La recepción ya pasó por calidad y no puede cancelarse: lo aprobado ya es existencia.",
      op: "La OP OP-00012 ya está completada y la recepción no puede cancelarse.",
      facturas_proveedores:
        "La factura de proveedor FP-00003 de la recepción está registrada: cancélala primero en Finanzas.",
    };
    for (const [key, message] of Object.entries(casos)) {
      const result = classifyReceiptCancelError(httpError(400, { [key]: message }));
      expect(result).toEqual({ kind: "blocked", message });
      expect(receiptCancelErrorClosesDialog(result)).toBe(true);
    }
  });

  test("403 muestra el detail del backend tal cual y no cierra", () => {
    const detail = "Solo un administrador de la empresa puede cancelar recepciones.";
    const result = classifyReceiptCancelError(httpError(403, { detail }));
    expect(result).toEqual({ kind: "other", message: detail });
    expect(receiptCancelErrorClosesDialog(result)).toBe(false);
  });

  test("404 es 'no disponible' y cierra", () => {
    const result = classifyReceiptCancelError(httpError(404, { detail: "No encontrado." }));
    expect(result).toEqual({ kind: "not-found", message: RECEIPT_CANCEL_NOT_FOUND_MESSAGE });
    expect(receiptCancelErrorClosesDialog(result)).toBe(true);
  });

  test("red o 5xx sin cuerpo útil: genérico, no cierra", () => {
    expect(classifyReceiptCancelError(httpError(500, "<html>Server Error</html>"))).toEqual({
      kind: "other",
      message: RECEIPT_CANCEL_FALLBACK_MESSAGE,
    });
    const network = new AxiosError("Network Error", "ERR_NETWORK");
    expect(classifyReceiptCancelError(network)).toEqual({
      kind: "other",
      message: RECEIPT_CANCEL_FALLBACK_MESSAGE,
    });
  });
});
