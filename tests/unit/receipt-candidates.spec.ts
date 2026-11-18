import { expect, test } from "@playwright/test";
import {
  buildProductionTabRows,
  candidateHasLines,
  candidateKey,
  candidateSucursalId,
  productionTabRowCandidate,
  productionTabRowDisabledReason,
  productionTabRowKey,
  productionTabRowMatches,
  salidaMaquilaOrigenNombre,
} from "@/src/features/receipts/utils/receiptCandidates";
import {
  buildReceiptFormSchema,
  CANTIDADES_REQUIRED_MESSAGE,
} from "@/src/features/receipts/schemas/receipt.schema";
import { firstNestedDrfMessage } from "@/src/utils/firstDrfMessage";
import type {
  ReceiptOnboardingProductionOrder,
  ReceiptOnboardingSalidaMaquila,
} from "@/src/features/receipts/interfaces/receipt-onboarding.interface";

/** EC-912: las SM pendientes se reciben desde la pestaña "Orden de Producción". */

const op = (id: number, sucursal_id = 1): ReceiptOnboardingProductionOrder => ({
  id,
  folio: `2026-OP-${id}`,
  estatus: 1,
  pedido_id: null,
  sucursal_id,
  fecha_inicio: "2026-11-01",
  cerrar_orden: false,
  detalle: [],
});

const sm = (
  id: number,
  origen: "OP" | "OB" | "OR",
  op_id: number | null,
  sucursal_id = 2,
): ReceiptOnboardingSalidaMaquila => ({
  id,
  folio: `SM-${id}`,
  folio_display: `SM-${id} · X`,
  origen,
  origen_folio: origen === "OP" ? `2026-OP-${op_id}` : `${origen}-0006`,
  op_id,
  centro_confeccion: 9,
  centro_confeccion_nombre: "Maquilas del Norte",
  sucursal_id,
  fecha_envio: "2026-11-18",
  total_piezas: 10,
  total: 1500,
});

test("una OP y una SM con el mismo id son filas distintas", () => {
  const rows = buildProductionTabRows([op(12)], [sm(12, "OB", null)]);
  const keys = rows.map(productionTabRowKey);
  expect(keys).toEqual(["op-12", "sm-12"]);
  expect(new Set(keys).size).toBe(2);
});

test("la SM de OB/OR se recibe sin renglones, con la sucursal de la SM", () => {
  const [row] = buildProductionTabRows([], [sm(5, "OR", null, 7)]);
  expect(productionTabRowDisabledReason(row)).toBeNull();
  const candidate = productionTabRowCandidate(row)!;
  expect(candidate.type).toBe("salida-maquila");
  expect(candidateHasLines(candidate)).toBe(false);
  expect(candidateSucursalId(candidate)).toBe(7);
  expect(candidateKey(candidate)).toBe("sm-5");
});

test("la SM de OP lleva su OP: renglones de la OP y llave de la SM", () => {
  const rows = buildProductionTabRows([op(3, 4)], [sm(8, "OP", 3)]);
  const candidate = productionTabRowCandidate(rows[1])!;
  expect(candidate.type).toBe("produccion");
  if (candidate.type !== "produccion") throw new Error("tipo");
  expect(candidate.order.id).toBe(3);
  expect(candidate.salidaMaquila?.id).toBe(8);
  expect(candidateHasLines(candidate)).toBe(true);
  expect(candidateSucursalId(candidate)).toBe(4);
  expect(candidateKey(candidate)).toBe("sm-8");
  // La OP sola sigue siendo su propia fila.
  expect(candidateKey(productionTabRowCandidate(rows[0])!)).toBe("op-3");
});

test("la SM de OP sin su OP en el onboarding queda deshabilitada", () => {
  const [row] = buildProductionTabRows([], [sm(8, "OP", 99)]);
  expect(productionTabRowDisabledReason(row)).not.toBeNull();
  expect(productionTabRowCandidate(row)).toBeNull();
});

test("busca por folio de origen, folio de SM, maquilero y origen", () => {
  const [row] = buildProductionTabRows([], [sm(1, "OB", null)]);
  expect(productionTabRowMatches(row, "ob-0006")).toBe(true);
  expect(productionTabRowMatches(row, "sm-1")).toBe(true);
  expect(productionTabRowMatches(row, "norte")).toBe(true);
  expect(productionTabRowMatches(row, "bordado")).toBe(true);
  expect(productionTabRowMatches(row, "zzz")).toBe(false);
});

test("nombre del origen sin la sigla", () => {
  expect(salidaMaquilaOrigenNombre({ origen: "OB" })).toBe("Bordado");
  expect(salidaMaquilaOrigenNombre({ origen: "OR" })).toBe("Reflejante");
  expect(salidaMaquilaOrigenNombre({ origen: "OP" })).toBe("Producción");
});

test("el 400 de salida_maquila (string plano, no lista) llega al toast", () => {
  expect(firstNestedDrfMessage({ salida_maquila: "La SM SM-00012 está recibida." })).toBe(
    "La SM SM-00012 está recibida.",
  );
});

test("sin renglones no se exige ninguna cantidad", () => {
  const base = {
    almacen: 1,
    serie_codigo: "RC",
    remision: "",
    factura_referencia: "",
    observaciones: "",
    cantidades: {},
  };
  expect(buildReceiptFormSchema({ conRenglones: false }).safeParse(base).success).toBe(true);
  const conRenglones = buildReceiptFormSchema({ conRenglones: true }).safeParse(base);
  expect(conRenglones.success).toBe(false);
  expect(conRenglones.error?.issues[0]?.message).toBe(CANTIDADES_REQUIRED_MESSAGE);
});
