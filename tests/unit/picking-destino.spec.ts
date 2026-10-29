import { expect, test } from "@playwright/test";
import type { PickingOnboardingProgramacion } from "@/src/features/picking/interfaces/picking-onboarding.interface";
import {
  getAlmacenSugeridoPreseleccionable,
  getDestinoOptions,
  getProgramacionDestinoLabel,
} from "@/src/features/picking/utils/pickingDestino";

/**
 * Pruebas unitarias de EC-643: hacia dónde preseleccionar el surtido a partir
 * de las programaciones del pedido, y qué destinos ofrece el Paso 1.
 */

const prog = (
  destino: string,
  almacen: PickingOnboardingProgramacion["almacen_sugerido"],
): PickingOnboardingProgramacion => ({ destino, cantidad: 4, comentarios: "", almacen_sugerido: almacen });

const apartados = { id: 10, nombre: "APARTADOS" };
const bordados = { id: 28, nombre: "BORDADOS" };
const opciones = [{ id: 10 }, { id: 28 }];

test.describe("getAlmacenSugeridoPreseleccionable", () => {
  test("un único sugerido presente entre las opciones se preselecciona", () => {
    expect(getAlmacenSugeridoPreseleccionable([prog("APARTADO", apartados)], opciones)).toBe(10);
  });

  test("varias programaciones al MISMO almacén cuentan como uno; las null no cuentan", () => {
    const programaciones = [prog("APARTADO", apartados), prog("APARTADO", apartados), prog("EMBARQUE", null)];
    expect(getAlmacenSugeridoPreseleccionable(programaciones, opciones)).toBe(10);
  });

  test("dos sugeridos distintos no preseleccionan", () => {
    const programaciones = [prog("APARTADO", apartados), prog("BORDADO", bordados)];
    expect(getAlmacenSugeridoPreseleccionable(programaciones, opciones)).toBeNull();
  });

  test("sin sugerido (todas null) no preselecciona", () => {
    expect(getAlmacenSugeridoPreseleccionable([prog("EMBARQUE", null)], opciones)).toBeNull();
  });

  test("un sugerido fuera de las opciones no se preselecciona", () => {
    expect(getAlmacenSugeridoPreseleccionable([prog("APARTADO", apartados)], [{ id: 28 }])).toBeNull();
  });
});

test.describe("getDestinoOptions", () => {
  const almacenes = [
    { id: 1, codigo: "PT", nombre: "PRODUCTO TERMINADO", sucursal: 1 },
    { id: 10, codigo: "AP", nombre: "APARTADOS", sucursal: 1 },
    { id: 11, codigo: "AP2", nombre: "APARTADOS", sucursal: 2 },
    { id: 12, codigo: "EMP", nombre: "EMPRESA", sucursal: null },
  ];

  test("sin pedido: todos menos el origen fijo", () => {
    expect(getDestinoOptions(almacenes, null).map((a) => a.id)).toEqual([10, 11, 12]);
  });

  test("con pedido: su sucursal más los de alcance empresa", () => {
    expect(getDestinoOptions(almacenes, { sucursal: 2 }).map((a) => a.id)).toEqual([11, 12]);
  });
});

test.describe("getProgramacionDestinoLabel", () => {
  test("etiqueta conocida y código desconocido tal cual", () => {
    expect(getProgramacionDestinoLabel("CORTE_MANGA")).toBe("Corte de manga");
    expect(getProgramacionDestinoLabel("LAVADO")).toBe("LAVADO");
  });
});
