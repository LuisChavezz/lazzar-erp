import { expect, test } from "@playwright/test";
import {
  boxesStatus,
  buildCajasPayload,
  fillRemaining,
  lineTotals,
  moveLineTo,
  remainingFor,
  totalPeso,
  type PackingBox,
} from "@/src/features/packing/utils/packingBoxes";

const LINES = [
  { key: "11", pendiente: 10 },
  { key: "12", pendiente: 4 },
];
const box = (id: string, contenido: Record<string, string>, peso = ""): PackingBox => ({ id, peso, contenido });

test("lo que falta se reparte en la caja elegida sin tocar las otras", () => {
  const boxes = [box("a", { "11": "6" }), box("b", {})];
  const next = fillRemaining(boxes, 1, LINES);
  expect(next[0].contenido).toEqual({ "11": "6" });
  expect(next[1].contenido).toEqual({ "11": "4", "12": "4" });
  expect(LINES.map((l) => remainingFor(next, l))).toEqual([0, 0]);
});

test("mover una línea la deja completa en una sola caja", () => {
  const next = moveLineTo([box("a", { "11": "3" }), box("b", { "11": "2" })], 1, LINES[0]);
  expect(next.map((b) => b.contenido["11"])).toEqual(["", "10"]);
});

test("totales por línea, peso y estado", () => {
  const boxes = [box("a", { "11": "6", "12": "5" }, "12.5"), box("b", { "11": "4" }, "8"), box("c", {})];
  expect(lineTotals(boxes, LINES)).toEqual({ "11": 10, "12": 5 });
  expect(totalPeso(boxes)).toBe(20.5);
  expect(totalPeso([box("x", {})])).toBeNull();
  const s = boxesStatus(boxes, LINES);
  expect(s).toEqual({ acomodadas: 14, pendientes: 14, excedidas: ["12"], cajasVacias: [3], cajasSinPeso: [3] });
});

test("payload de cajas numera en orden y omite lo vacío", () => {
  const boxes = [box("a", { "11": "6" }, "3.2"), box("b", { "11": "4", "12": "4" })];
  expect(buildCajasPayload(boxes, LINES)).toEqual([
    { numero: 1, peso: "3.2", contenido: [{ picking_detalle: 11, cantidad: "6" }] },
    {
      numero: 2,
      contenido: [
        { picking_detalle: 11, cantidad: "4" },
        { picking_detalle: 12, cantidad: "4" },
      ],
    },
  ]);
});

test("el error de cajas dice en qué caja está", async () => {
  const { firstCajasMessage } = await import("@/src/features/packing/hooks/useCreatePacking");
  expect(firstCajasMessage([{}, { contenido: [{}, { cantidad: ["Excede lo pendiente."] }] }])).toBe(
    "Caja 2: Excede lo pendiente.",
  );
  expect(firstCajasMessage("Las cajas deben ser consecutivas.")).toBe("Las cajas deben ser consecutivas.");
});

test("teclear en una caja descuenta el excedente de las otras", async () => {
  const { setBoxLineQty } = await import("@/src/features/packing/utils/packingBoxes");
  const boxes = [box("a", { "11": "10" }), box("b", {})];
  const next = setBoxLineQty(boxes, 1, LINES[0], "4");
  expect(next.map((b) => b.contenido["11"])).toEqual(["6", "4"]);
  expect(setBoxLineQty(boxes, 1, LINES[0], "25").map((b) => b.contenido["11"])).toEqual(["", "10"]);
  // Bajar una caja no rellena las otras: lo que sobra queda como "falta".
  expect(setBoxLineQty(next, 1, LINES[0], "1").map((b) => b.contenido["11"])).toEqual(["6", "1"]);
});
