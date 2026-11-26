import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  buildLineCeilings,
  reconcileCheckedLines,
  reconcileLineQuantities,
  sanitizeIntegerInput,
  seedLineSelection,
  validateWorkOrderLines,
  workOrderLineDescripcion,
  workOrderLineSampleSku,
  type WorkOrderLineRow,
} from "@/src/utils/workOrderLineQuantities";
import { getWorkOrderSaldo } from "@/src/utils/formatWorkOrderProgramado";
import { parseCorteMangaOrderError } from "@/src/features/corte-manga/utils/parseCorteMangaOrderError";
import { buildCorteMangaOrderPayload } from "@/src/features/corte-manga/utils/buildCorteMangaOrderPayload";

/**
 * EC-967: reglas del Paso 2 de OR y OCM (techo `min(pendiente, disponible)`,
 * reparto inicial de lo disponible en el orden del pedido, total topado) y el
 * reparto de errores del alta de OCM.
 */

const row = (
  id: number,
  cantidad_pendiente: number,
  extra: Partial<WorkOrderLineRow> = {},
): WorkOrderLineRow => ({
  pedido_detalle_talla_id: id,
  producto_id: 1,
  producto_nombre: "PLAYERA",
  producto_nombre_externo: null,
  talla_nombre: "M",
  cantidad_pendiente,
  ...extra,
});

const saldo = (programado: number, enOrdenes: number) => ({
  programado,
  enOrdenes,
  disponible: Math.max(0, programado - enOrdenes),
});

test.describe("techos y siembra", () => {
  test("pedido 2136: 3 piezas pendientes, 1 programada → techo y propuesta de 1", () => {
    const rows = [row(3282, 3)];
    expect(buildLineCeilings(rows, 1).get(3282)).toBe(1);
    const seed = seedLineSelection(rows, 1);
    expect([...seed.checkedIds]).toEqual([3282]);
    expect(seed.quantities.get(3282)).toBe("1");
  });

  test("la propuesta reparte lo disponible en el orden del pedido", () => {
    const rows = [row(1, 4), row(2, 5), row(3, 2)];
    const seed = seedLineSelection(rows, 6);
    expect([...seed.checkedIds]).toEqual([1, 2]);
    expect(seed.quantities.get(1)).toBe("4");
    expect(seed.quantities.get(2)).toBe("2");
    expect(seed.quantities.has(3)).toBe(false);
    // Cada línea sigue topada al mínimo de su pendiente y lo disponible.
    expect([...buildLineCeilings(rows, 6).values()]).toEqual([4, 5, 2]);
  });

  test("sin programación no hay tope; los pendientes fraccionarios se truncan", () => {
    const rows = [row(1, 2.9), row(2, 0)];
    expect([...buildLineCeilings(rows, null).values()]).toEqual([2, 0]);
    const seed = seedLineSelection(rows, null);
    expect([...seed.checkedIds]).toEqual([1]);
    expect(seed.quantities.get(1)).toBe("2");
  });

  test("lo disponible en 0 deja todas las líneas sin techo", () => {
    const rows = [row(1, 3)];
    expect(buildLineCeilings(rows, 0).get(1)).toBe(0);
    expect(seedLineSelection(rows, 0).checkedIds.size).toBe(0);
  });
});

test.describe("reconciliación tras un refetch", () => {
  test("baja lo capturado al techo nuevo y desmarca lo que se quedó sin techo", () => {
    const quantities = new Map([
      [1, "5"],
      [2, "2"],
    ]);
    const ceilings = new Map([
      [1, 3],
      [2, 0],
    ]);
    const next = reconcileLineQuantities(quantities, ceilings);
    expect(next.get(1)).toBe("3");
    expect(next.has(2)).toBe(false);
    expect([...reconcileCheckedLines(new Set([1, 2]), ceilings)]).toEqual([1]);
  });

  test("sin cambios devuelve la MISMA colección", () => {
    const quantities = new Map([[1, "2"]]);
    const checked = new Set([1]);
    const ceilings = new Map([[1, 3]]);
    expect(reconcileLineQuantities(quantities, ceilings)).toBe(quantities);
    expect(reconcileCheckedLines(checked, ceilings)).toBe(checked);
  });
});

test.describe("validateWorkOrderLines", () => {
  const rows = [row(1, 4), row(2, 5, { talla_nombre: "L" })];
  const ceilings = buildLineCeilings(rows, 6);
  const base = { rows, ceilings, saldo: saldo(6, 0), destinoLabel: "Corte de manga" };

  test("manda solo las líneas marcadas, con ids numéricos", () => {
    const result = validateWorkOrderLines({
      ...base,
      checkedIds: new Set([2]),
      quantities: new Map([
        [1, "4"],
        [2, "3"],
      ]),
    });
    expect(result).toEqual({ ok: true, lines: [{ pedido_detalle_talla_id: 2, cantidad: 3 }] });
  });

  test("el total no puede pasar de lo disponible de lo programado", () => {
    const result = validateWorkOrderLines({
      ...base,
      checkedIds: new Set([1, 2]),
      quantities: new Map([
        [1, "4"],
        [2, "5"],
      ]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.banner).toBe(
        "Mesa de Control programó 6 pzas a Corte de manga y 0 ya están en órdenes: esta orden puede llevar hasta 6, y lleva 9.",
      );
    }
  });

  test("lo programado ya en órdenes bloquea con su propio mensaje", () => {
    const result = validateWorkOrderLines({
      ...base,
      ceilings: new Map([
        [1, 4],
        [2, 5],
      ]),
      saldo: saldo(6, 6),
      checkedIds: new Set([1]),
      quantities: new Map([[1, "1"]]),
    });
    expect(!result.ok && result.banner).toBe(
      "Lo que Mesa de Control programó a Corte de manga ya está en otras órdenes. Pide que programen más piezas para crear otra.",
    );
  });

  test("una línea por encima de su techo se reporta con su talla", () => {
    const result = validateWorkOrderLines({
      ...base,
      checkedIds: new Set([1]),
      quantities: new Map([[1, "9"]]),
    });
    expect(!result.ok && result.issueLines).toEqual([
      "«PLAYERA · Talla M»: capturaste 9, pero solo quedan 4 pendientes.",
    ]);
  });

  test("distingue el input vacío del 0 explícito", () => {
    const result = validateWorkOrderLines({
      ...base,
      checkedIds: new Set([1, 2]),
      quantities: new Map([[2, "0"]]),
    });
    expect(!result.ok && result.issueLines).toEqual([
      "«PLAYERA · Talla M»: sin cantidad capturada.",
      "«PLAYERA · Talla L»: la cantidad debe ser mayor a 0.",
    ]);
  });

  test("sin líneas marcadas no se envía nada", () => {
    const result = validateWorkOrderLines({ ...base, checkedIds: new Set(), quantities: new Map() });
    expect(!result.ok && result.banner).toBe(
      "Selecciona al menos una prenda del pedido para incluirla en la orden.",
    );
  });
});

test("una muestra con SKU se rotula con su nombre y muestra el SKU", () => {
  const muestra = row(7, 2, {
    producto_id: null,
    producto_nombre: null,
    producto_nombre_externo: "PANTALON CHAIN YSL | YELLOW N GOLD",
    talla_nombre: "28",
    sku: "MP2177-302-28",
  });
  expect(workOrderLineDescripcion(muestra)).toBe("PANTALON CHAIN YSL | YELLOW N GOLD · Talla 28");
  expect(workOrderLineSampleSku(muestra)).toBe("MP2177-302-28");
  expect(workOrderLineSampleSku(row(8, 1, { sku: "X" }))).toBeNull();
});

test("sanitizeIntegerInput deja solo dígitos sin ceros a la izquierda", () => {
  expect(sanitizeIntegerInput("1.5")).toBe("15");
  expect(sanitizeIntegerInput("007")).toBe("7");
  expect(sanitizeIntegerInput("0")).toBe("0");
});

test("el saldo de OCM sale de `programado` del onboarding (pedido 2136)", () => {
  expect(
    getWorkOrderSaldo({
      id: 2136,
      folio: "P-00182-2026",
      cliente_nombre: null,
      programado: { cantidad: 1, fecha: "2026-11-25T15:59:56Z", usuario_nombre: "X", asignado: 0, disponible: 1 },
      detalles: [{ cantidad_asignada: 0 }],
    }),
  ).toEqual({ programado: 1, enOrdenes: 0, disponible: 1 });
});

test.describe("alta de OCM: payload y errores", () => {
  const httpError = (status: number, data: unknown): AxiosError => {
    const config = { headers: new AxiosHeaders() };
    const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
  };

  test("el payload lleva detalles_override y omite observaciones vacías", () => {
    expect(
      buildCorteMangaOrderPayload({ pedido: 2136, observaciones: "  " }, [
        { pedido_detalle_talla_id: 3282, cantidad: 1 },
      ]),
    ).toEqual({ pedido: 2136, detalles_override: [{ pedido_detalle_talla_id: 3282, cantidad: 1 }] });
    // Un arreglo vacío nunca viaja: equivaldría a pedir el 100% del pedido.
    expect(buildCorteMangaOrderPayload({ pedido: 1, observaciones: "" }, [])).toEqual({ pedido: 1 });
  });

  test("el tope programado (`err` string) llega verbatim", () => {
    const message =
      "No se puede generar la orden de corte de manga: excede lo programado por mesa de control (1 piezas; ya en órdenes 0, disponible 1, solicitado 3).";
    const parsed = parseCorteMangaOrderError(httpError(400, { err: message }));
    expect(parsed.formError).toBe(message);
    expect(parsed.excessLines).toBeUndefined();
  });

  test("`detalles_exceso` se conserva completo y `err` encabeza el banner", () => {
    const err =
      "No se puede generar la orden de corte de manga: una o más líneas exceden la cantidad disponible del pedido.";
    const lines = [
      "  - talla_id=4 pedido_detalle_id=2196: pedido=3, ya_asignado=1, solicitado=3, disponible_restante=2",
      "  - pedido_detalle_id=2196 (total del renglón): pedido=3, ya_asignado=1, solicitado=3, disponible_restante=2",
    ];
    const parsed = parseCorteMangaOrderError(httpError(400, { err, detalles_exceso: lines }));
    expect(parsed.formError).toBe(err);
    expect(parsed.excessLines).toEqual(lines.map((l) => l.trim()));
  });

  test("el `detalles_override` del serializer (lista) llega verbatim al banner", () => {
    const message =
      "`pedido_detalle_talla_id=99` no existe en el pedido `2136`.";
    const parsed = parseCorteMangaOrderError(httpError(400, { detalles_override: [message] }));
    expect(parsed.formError).toBe(message);
    expect(parsed.fieldErrors).toEqual({});
  });
});
