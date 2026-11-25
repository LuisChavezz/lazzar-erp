import { expect, test } from "@playwright/test";
import { buildWorkOrderPedidoOptions, getWorkOrderSaldo } from "@/src/utils/formatWorkOrderProgramado";
import { esProgramacionSugerida, faltantesDeSugerencia, piezasPendientesDeSku, sugerirProgramacion } from "@/src/features/orders/utils/pedidoProgramacionSugerida";

const prog = (cantidad: number) => ({ cantidad, fecha: "2026-11-20T13:53:09Z", usuario_nombre: "X" });

test("saldo: lo programado menos lo que ya tomaron las órdenes", () => {
  const p = { id: 1, folio: "P-1", cliente_nombre: "C", programado: prog(20), detalles: [{ cantidad_asignada: 20 }, { cantidad_asignada: 0 }] };
  expect(getWorkOrderSaldo(p)).toEqual({ programado: 20, enOrdenes: 20, disponible: 0 });
  expect(getWorkOrderSaldo({ ...p, programado: null })).toBeNull();
  expect(getWorkOrderSaldo({ ...p, detalles: [{ cantidad_asignada: 5 }] })?.disponible).toBe(15);
});

test("opciones: el pedido con la programación agotada sale deshabilitado y al final", () => {
  const agotado = { id: 1, folio: "P-1", cliente_nombre: "A", programado: prog(20), detalles: [{ cantidad_asignada: 20 }] };
  const libre = { id: 2, folio: "P-2", cliente_nombre: "B", programado: prog(10), detalles: [{ cantidad_asignada: 0 }] };
  const [first, second] = buildWorkOrderPedidoOptions([agotado, libre]);
  expect(first.value).toBe(2);
  expect(first.agotado).toBe(false);
  expect(second.agotado).toBe(true);
  expect(second.label).toContain("Ya en órdenes 20 pzas de 20 pzas");
});

test("sugerencia: cada talla a su primer servicio aplicable; sin servicio a Embarque", () => {
  const renglones = [
    { cantidad: 20, servicios: ["BORDADO"] },
    { cantidad: 50, servicios: [] },
    { cantidad: 10, servicios: ["REFLEJANTE", "BORDADO"] },
    { cantidad: 5, servicios: ["REFLEJANTE"] },
  ];
  expect(sugerirProgramacion(renglones, ["BORDADO", "EMBARQUE", "APARTADO"])).toEqual([
    { destino: "BORDADO", cantidad: 30, conVariosServicios: 0 },
    { destino: "EMBARQUE", cantidad: 55, conVariosServicios: 0 },
  ]);
  expect(sugerirProgramacion(renglones, ["BORDADO", "REFLEJANTE", "EMBARQUE"])).toEqual([
    { destino: "BORDADO", cantidad: 30, conVariosServicios: 10 },
    { destino: "REFLEJANTE", cantidad: 5, conVariosServicios: 0 },
    { destino: "EMBARQUE", cantidad: 50, conVariosServicios: 0 },
  ]);
});

test("sugerencia aplicada: mismos destinos y piezas, sin importar el orden ni las parcialidades", () => {
  const sug = [{ destino: "BORDADO" as const, cantidad: 30, conVariosServicios: 0 }, { destino: "EMBARQUE" as const, cantidad: 50, conVariosServicios: 0 }];
  expect(esProgramacionSugerida([{ destino: "EMBARQUE", cantidad: "50" }, { destino: "BORDADO", cantidad: "30" }], sug)).toBe(true);
  expect(esProgramacionSugerida([{ destino: "BORDADO", cantidad: "20" }, { destino: "BORDADO", cantidad: "10" }, { destino: "EMBARQUE", cantidad: "50" }], sug)).toBe(true);
  expect(esProgramacionSugerida([{ destino: "BORDADO", cantidad: "20" }], sug)).toBe(false);
});

test("faltantes: lo ya programado se conserva y solo se agrega lo que falta por destino (P-00176)", () => {
  const sug = [{ destino: "BORDADO" as const, cantidad: 240, conVariosServicios: 0 }, { destino: "EMBARQUE" as const, cantidad: 220, conVariosServicios: 0 }];
  expect(faltantesDeSugerencia([{ destino: "BORDADO", cantidad: "20" }], sug)).toEqual([
    { destino: "BORDADO", sugerido: 240, programado: 20, faltan: 220 },
    { destino: "EMBARQUE", sugerido: 220, programado: 0, faltan: 220 },
  ]);
  // Si ya se pasó de lo sugerido, no se agrega nada (ni negativos).
  expect(faltantesDeSugerencia([{ destino: "EMBARQUE", cantidad: "300" }], sug)[1].faltan).toBe(0);
});

test("saldo: con nucleo-erp#1274 manda el backend (asignado/disponible), aunque las tallas digan otra cosa", () => {
  const p = {
    id: 1, folio: "P-1", cliente_nombre: "C",
    programado: { ...prog(20), asignado: 15, disponible: 5 },
    detalles: [{ cantidad_asignada: 0 }],
  };
  expect(getWorkOrderSaldo(p)).toEqual({ programado: 20, enOrdenes: 15, disponible: 5 });
  // Solo `disponible_programado` en el pedido: el disponible viene de ahí.
  const q = { id: 2, folio: "P-2", cliente_nombre: "C", programado: prog(20), disponible_programado: 3, detalles: [{ cantidad_asignada: 10 }] };
  expect(getWorkOrderSaldo(q)).toEqual({ programado: 20, enOrdenes: 10, disponible: 3 });
});

test("la sugerencia no incluye tallas pendientes de SKU", () => {
  const renglones = [
    { cantidad: 10, servicios: ["REFLEJANTE"], pendiente_sku: false },
    { cantidad: 4, servicios: ["REFLEJANTE"], pendiente_sku: true },
    { cantidad: 3, servicios: ["REFLEJANTE"], pendiente_sku: false, variante_id: null },
  ];
  expect(sugerirProgramacion(renglones, ["REFLEJANTE", "EMBARQUE"])).toEqual([
    { destino: "REFLEJANTE", cantidad: 10, conVariosServicios: 0 },
  ]);
  expect(piezasPendientesDeSku(renglones)).toBe(7);
});
