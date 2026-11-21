import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  receiptLineErrors,
  receiptPayloadLineIds,
} from "@/src/features/receipts/utils/receiptErrors";
import { salidaMaquilaPendienteTexto } from "@/src/features/receipts/utils/receiptCandidates";

/** EC-919: el 400 del alta de recepción se pinta en su renglón. */

const http400 = (data: unknown) =>
  new AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const recepcionBase = {
  almacen: 1,
  serie_codigo: "RC",
  fecha_recepcion: "2026-11-21T00:00:00Z",
  remision: "",
  factura_referencia: "",
  observaciones: "",
  transportista: null,
};

test("los ids del payload van en el orden del detalle, para los tres orígenes", () => {
  expect(
    receiptPayloadLineIds({
      recepcion: { orden_produccion: 7, ...recepcionBase },
      detalle: [
        { orden_produccion_detalle: 40, cantidad_recibida: "1" },
        { orden_produccion_detalle: 41, cantidad_recibida: "2" },
      ],
    }),
  ).toEqual([40, 41]);
  expect(
    receiptPayloadLineIds({
      recepcion: { salida_maquila: 3, ...recepcionBase },
      detalle: [{ salida_maquila_detalle: 9, cantidad_recibida: "1" }],
    }),
  ).toEqual([9]);
  expect(
    receiptPayloadLineIds({
      recepcion: { orden_compra: 2, ...recepcionBase },
      detalle: [{ orden_compra_detalle: 5, cantidad_recibida: "1" }],
    }),
  ).toEqual([5]);
});

test("ubica '#N' en el renglón N del payload y quita la referencia interna", () => {
  const error = http400({
    detalle: [
      "El renglón #2 (orden_produccion_detalle 41, SKU PLA-894-M-894) tiene 4 pzas en maquila (SM-T1): recíbelas con su SM.",
    ],
  });
  expect(receiptLineErrors(error, [40, 41])).toEqual({
    porRenglon: { 41: "Tiene 4 pzas en maquila (SM-T1): recíbelas con su SM." },
    completo: true,
  });
});

test("SM de OB/OR: '#N (salida_maquila_detalle X)'", () => {
  const error = http400({
    detalle: ["El renglón #1 (salida_maquila_detalle 9) excede lo pendiente de la SM SM-00016 (1 pzas)."],
  });
  expect(receiptLineErrors(error, [9]).porRenglon).toEqual({
    9: "Excede lo pendiente de la SM SM-00016 (1 pzas).",
  });
});

test("un mensaje sin renglón o en otra llave no es completo (va al toast)", () => {
  expect(
    receiptLineErrors(
      http400({ detalle: ["La recepción debe tener al menos un renglón con cantidad recibida."] }),
      [40],
    ),
  ).toEqual({ porRenglon: {}, completo: false });
  expect(receiptLineErrors(http400({ almacen: "El almacén no pertenece a la sucursal de la SM." }), [40]).completo).toBe(
    false,
  );
  expect(
    receiptLineErrors(
      http400({ detalle: ["El renglón #1 (orden_produccion_detalle 40) excede la cantidad pendiente por recibir."], almacen: "x" }),
      [40],
    ),
  ).toEqual({ porRenglon: { 40: "Excede la cantidad pendiente por recibir." }, completo: false });
});

test("errores del serializer por posición y '#N' fuera de rango", () => {
  expect(
    receiptLineErrors(http400({ detalle: [{}, { cantidad_recibida: ["Número inválido."] }] }), [40, 41]),
  ).toEqual({ porRenglon: { 41: "Número inválido." }, completo: true });
  expect(receiptLineErrors(http400({ detalle: ["El renglón #5 no va en la SM SM-1."] }), [40]).completo).toBe(false);
});

test("no es un 400: nada por renglón", () => {
  expect(receiptLineErrors(new Error("x"), [1])).toEqual({ porRenglon: {}, completo: false });
});

test("piezas por regresar de una SM en el selector", () => {
  expect(salidaMaquilaPendienteTexto({ total_piezas: 37, piezas_pendientes: 6 })).toBe("Faltan 6 de 37 pzas");
  expect(salidaMaquilaPendienteTexto({ total_piezas: 1, piezas_pendientes: 1 })).toBe("1 pzas por regresar");
  expect(salidaMaquilaPendienteTexto({ total_piezas: 3 })).toBeNull();
});
