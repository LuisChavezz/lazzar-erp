import { expect, test } from "@playwright/test";
import {
  findReceiptLineByScan,
  groupReceiptLines,
  leerEnRecepcion,
  type ReceiptScanLine,
} from "../../src/features/receipts/utils/receiptScan";
import { PendingQuantities } from "../../src/utils/pendingQuantities";

const line = (over: Partial<ReceiptScanLine>): ReceiptScanLine => ({
  id: 1,
  nombre: "PLAYERA",
  color: "AZUL",
  talla: "CH",
  sku: "1018800CH",
  codigo: "1018",
  proscai: "PRS-1018",
  ordenado: 5,
  pendiente: 5,
  enMaquila: 0,
  enMaquilaFolios: [],
  tope: 5,
  sinTope: null,
  ...over,
});

test("reconoce el renglón por SKU con o sin diagonales", () => {
  const lines = [line({ id: 1 }), line({ id: 2, talla: "M", sku: "1018800M" })];
  expect(findReceiptLineByScan(lines, "1018/800/M", () => true)?.id).toBe(2);
  expect(findReceiptLineByScan(lines, " 1018800ch ", () => true)?.id).toBe(1);
  expect(findReceiptLineByScan(lines, "9999", () => true)).toBeNull();
});

test("reconoce también el código raíz y el Proscai", () => {
  const lines = [line({ id: 1, sku: null }), line({ id: 2, codigo: "2000", proscai: null, sku: null })];
  expect(findReceiptLineByScan(lines, "prs-1018", () => true)?.id).toBe(1);
  expect(findReceiptLineByScan(lines, "2000", () => true)?.id).toBe(2);
});

test("con el mismo código en dos renglones gana el que tiene cupo", () => {
  const lines = [line({ id: 1 }), line({ id: 2 })];
  expect(findReceiptLineByScan(lines, "1018800CH", (l) => l.id === 2)?.id).toBe(2);
  expect(findReceiptLineByScan(lines, "1018800CH", () => false)?.id).toBe(1);
});

test("agrupa por producto y color", () => {
  const groups = groupReceiptLines([
    line({ id: 1 }),
    line({ id: 2, talla: "M" }),
    line({ id: 3, color: "ROJO" }),
  ]);
  expect(groups.map((g) => g.lines.map((l) => l.id))).toEqual([[1, 2], [3]]);
});

/**
 * Una tanda de la antena (EC-997): todas las lecturas de un sondeo corren con
 * las MISMAS cantidades del render anterior, como en `ReceiptLinesPanel`; lo
 * que van sumando solo lo ve `PendingQuantities`.
 */
const tandaRecepcion = (lines: ReceiptScanLine[], cantidades: Record<string, string>, codigos: string[]) => {
  const enVuelo = new PendingQuantities();
  const escritas: Record<string, string> = {};
  const resultados = codigos.map((codigo) => {
    const qty = (l: ReceiptScanLine) => Math.min(Number(enVuelo.read(cantidades, String(l.id))) || 0, l.tope);
    const { result, line: renglon, cantidad } = leerEnRecepcion(lines, codigo, qty);
    if (renglon && cantidad !== undefined) {
      enVuelo.write(cantidades, String(renglon.id), String(cantidad));
      escritas[renglon.id] = String(cantidad);
    }
    return result;
  });
  return { resultados, escritas, enVuelo };
};

test.describe("tanda de lecturas de la antena (EC-997)", () => {
  test("N lecturas en la misma tanda suman N", () => {
    const lines = [line({ id: 1, tope: 200, pendiente: 200, ordenado: 200 })];
    const { resultados, escritas } = tandaRecepcion(lines, {}, Array(120).fill("1018800CH"));
    expect(escritas).toEqual({ 1: "120" });
    expect(resultados.filter((r) => r.tone === "ok")).toHaveLength(120);
    expect(resultados[119]).toEqual({ tone: "ok", title: "+1 PLAYERA · CH", detail: "120 de 200" });
  });
  test("más lecturas que lo pendiente: suma exactamente lo pendiente y el resto sale como completo", () => {
    const lines = [line({ id: 1, tope: 200, pendiente: 200, ordenado: 200 })];
    const { resultados, escritas } = tandaRecepcion(lines, { 1: "3" }, Array(210).fill("1018800CH"));
    expect(escritas).toEqual({ 1: "200" });
    expect(resultados.filter((r) => r.tone === "ok")).toHaveLength(197);
    const sobrantes = resultados.filter((r) => r.tone !== "ok");
    expect(sobrantes).toHaveLength(13);
    expect(sobrantes[0]).toEqual({ tone: "warn", title: "Ya está completo", detail: "PLAYERA · CH: 200 de 200" });
  });
  test("tanda mezclada: cada lectura con su resultado, y el cupo pasa al siguiente renglón con el mismo código", () => {
    const lines = [
      line({ id: 1, tope: 1 }),
      line({ id: 2, tope: 2 }),
      line({ id: 3, sku: "1018800M", talla: "M", tope: 0, sinTope: "Ya se recibió todo" }),
      line({ id: 4, sku: "1018800G", talla: "G", tope: 0.5 }),
    ];
    const { resultados, escritas } = tandaRecepcion(lines, {}, [
      "1018800CH",
      "9999",
      "1018800CH",
      "1018800M",
      "1018800CH",
      "1018800CH",
      "1018800G",
    ]);
    expect(resultados.map((r) => [r.tone, r.title])).toEqual([
      ["ok", "+1 PLAYERA · CH"],
      ["error", "No está en esta orden"],
      ["ok", "+1 PLAYERA · CH"],
      ["warn", "Ya se recibió todo"],
      ["ok", "+1 PLAYERA · CH"],
      ["warn", "Ya está completo"],
      ["warn", "Falta menos de una pieza"],
    ]);
    expect(escritas).toEqual({ 1: "1", 2: "2" });
  });
  test("con el render nuevo manda el formulario: una edición a mano no se pisa", () => {
    const lines = [line({ id: 1, tope: 200 })];
    const { enVuelo } = tandaRecepcion(lines, {}, Array(5).fill("1018800CH"));
    // Llegó el render con lo que el operador dejó a mano (Limpiar → 0).
    expect(enVuelo.read({ 1: "0" }, "1")).toBe("0");
  });
});
