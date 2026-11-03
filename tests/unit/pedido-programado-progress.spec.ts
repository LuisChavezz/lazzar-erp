import { expect, test } from "@playwright/test";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
import type { PedidoProgramacion } from "@/src/features/orders/interfaces/pedido-programacion.interface";
import { getPedidoProgramadoProgress } from "@/src/features/orders/utils/pedidoProgramadoProgress";

/**
 * Pruebas unitarias de EC-737: "Programado X de Y" del listado de Mesa de
 * Control, con X = suma de `parcialidades[].cantidad` e Y = `piezas_programables`.
 */
const parcialidad = (cantidad: number): PedidoProgramacion => ({ destino: "EMBARQUE", cantidad });

const order = (
  overrides: Partial<Parameters<typeof getPedidoProgramadoProgress>[0]> = {},
): Parameters<typeof getPedidoProgramadoProgress>[0] => ({
  estatus: PEDIDO_ESTATUS.AUTORIZADA,
  piezas: 630,
  piezas_programables: 630,
  parcialidades: [],
  programacion_conf: null,
  ...overrides,
});

test("suma las parcialidades contra piezas_programables", () => {
  expect(
    getPedidoProgramadoProgress(order({ parcialidades: [parcialidad(10), parcialidad(1)] })),
  ).toEqual({ programado: 11, total: 630, excedente: 0, visible: true });
});

test("sin programar es 0 de Y y sigue visible", () => {
  expect(getPedidoProgramadoProgress(order())).toMatchObject({ programado: 0, visible: true });
});

test("usa piezas_programables aunque difiera de piezas", () => {
  expect(getPedidoProgramadoProgress(order({ piezas: 20, piezas_programables: 15 })).total).toBe(15);
});

test("cae a piezas cuando el backend no manda piezas_programables", () => {
  const progress = getPedidoProgramadoProgress(
    order({ piezas: 20, piezas_programables: undefined, parcialidades: [parcialidad(10)] }),
  );
  expect(progress).toEqual({ programado: 10, total: 20, excedente: 0, visible: true });
});

test("sin parcialidades en el payload cuenta 0", () => {
  expect(getPedidoProgramadoProgress(order({ parcialidades: undefined })).programado).toBe(0);
});

test("X > Y reporta el excedente", () => {
  const progress = getPedidoProgramadoProgress(
    order({ piezas: 2, piezas_programables: 2, parcialidades: [parcialidad(4), parcialidad(1)] }),
  );
  expect(progress).toEqual({ programado: 5, total: 2, excedente: 3, visible: true });
});

test("Y = 0 no se muestra", () => {
  expect(
    getPedidoProgramadoProgress(order({ piezas: 0, piezas_programables: 0 })).visible,
  ).toBe(false);
});

test("un pedido cancelado no se muestra aunque tenga programación", () => {
  expect(
    getPedidoProgramadoProgress(
      order({ estatus: PEDIDO_ESTATUS.CANCELADO, parcialidades: [parcialidad(5)] }),
    ).visible,
  ).toBe(false);
});

test("ignora renglones inválidos y cantidades no numéricas del JSONField", () => {
  const parcialidades = [
    parcialidad(3),
    null,
    { destino: "EMBARQUE", cantidad: "7" },
    { destino: "EMBARQUE", cantidad: Number.NaN },
  ] as unknown as PedidoProgramacion[];
  expect(getPedidoProgramadoProgress(order({ parcialidades })).programado).toBe(3);
});

test("Y = 0 con X > 0 se muestra como excedente", () => {
  expect(
    getPedidoProgramadoProgress(
      order({ piezas: 0, piezas_programables: 0, parcialidades: [parcialidad(10)] }),
    ),
  ).toEqual({ programado: 10, total: 0, excedente: 10, visible: true });
});

test("Y = 0 y X = 0 no se muestra", () => {
  expect(
    getPedidoProgramadoProgress(order({ piezas: 0, piezas_programables: 0, parcialidades: [] }))
      .visible,
  ).toBe(false);
});

test("un pedido cancelado con X > 0 y Y = 0 tampoco se muestra", () => {
  expect(
    getPedidoProgramadoProgress(
      order({
        estatus: PEDIDO_ESTATUS.CANCELADO,
        piezas: 0,
        piezas_programables: 0,
        parcialidades: [parcialidad(10)],
      }),
    ).visible,
  ).toBe(false);
});

test("sin parcialidades en el payload suma programacion_conf", () => {
  const progress = getPedidoProgramadoProgress(
    order({
      parcialidades: undefined,
      programacion_conf: { programaciones: [parcialidad(4), parcialidad(6)] },
    }),
  );
  expect(progress.programado).toBe(10);
});

test("con parcialidades presentes ignora programacion_conf", () => {
  const progress = getPedidoProgramadoProgress(
    order({
      parcialidades: [parcialidad(2)],
      programacion_conf: { programaciones: [parcialidad(99)] },
    }),
  );
  expect(progress.programado).toBe(2);
});

test("ignora cantidades negativas, fraccionarias y no numéricas", () => {
  const invalidas = [
    parcialidad(5),
    parcialidad(-5),
    parcialidad(2.5),
    parcialidad(0),
    { destino: "EMBARQUE", cantidad: "3" },
  ] as unknown as PedidoProgramacion[];
  expect(getPedidoProgramadoProgress(order({ parcialidades: invalidas })).programado).toBe(5);
  expect(
    getPedidoProgramadoProgress(
      order({ parcialidades: undefined, programacion_conf: { programaciones: invalidas } }),
    ).programado,
  ).toBe(5);
});
