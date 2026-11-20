import { expect, test } from "@playwright/test";
import {
  findReceiptLineByScan,
  groupReceiptLines,
  type ReceiptScanLine,
} from "../../src/features/receipts/utils/receiptScan";

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
