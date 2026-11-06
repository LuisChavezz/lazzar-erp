import { expect, test } from "@playwright/test";
import {
  almacenesDeSucursal,
  almacenPreseleccionado,
  almacenPutPatch,
  almacenSelectState,
  optionalText,
} from "@/src/features/purchase-orders/utils/purchaseOrderDelivery";

/**
 * Pruebas unitarias de EC-796: almacén destino de la OC (alta, edición y
 * recepción) y normalización de los textos de la dirección de entrega.
 */

const almacenes = [
  { id_almacen: 1, codigo: "A1", nombre: "MATRIZ", sucursal_id: 10 },
  { id_almacen: 2, codigo: "A2", nombre: "CEDIS", sucursal_id: 10 },
  { id_almacen: 3, codigo: "B1", nombre: "NORTE", sucursal_id: 20 },
  { id_almacen: 4, codigo: "X1", nombre: "SIN SUCURSAL", sucursal_id: null },
];

test.describe("almacenesDeSucursal", () => {
  test("solo los de la sucursal; los sin sucursal quedan fuera", () => {
    expect(almacenesDeSucursal(almacenes, 10).map((a) => a.id_almacen)).toEqual([1, 2]);
    expect(almacenesDeSucursal(almacenes, 20).map((a) => a.id_almacen)).toEqual([3]);
  });

  test("sin sucursal elegida no hay ninguno (ni los de sucursal null)", () => {
    expect(almacenesDeSucursal(almacenes, 0)).toEqual([]);
    expect(almacenesDeSucursal(almacenes, null)).toEqual([]);
  });
});

test.describe("almacenSelectState", () => {
  test("con sucursal: placeholder + sus almacenes como codigo — nombre", () => {
    expect(almacenSelectState({ almacenes, sucursalId: 10, emptyLabel: "Elegir" })).toEqual({
      options: [
        { value: 0, label: "Elegir" },
        { value: 1, label: "A1 — MATRIZ" },
        { value: 2, label: "A2 — CEDIS" },
      ],
      disabled: false,
    });
  });

  test("sin sucursal o sin almacenes: deshabilitado con aviso", () => {
    expect(almacenSelectState({ almacenes, sucursalId: 0, emptyLabel: "Elegir" })).toEqual({
      options: [{ value: 0, label: "Elige primero una sucursal" }],
      disabled: true,
    });
    expect(almacenSelectState({ almacenes, sucursalId: 99, emptyLabel: "Elegir" })).toEqual({
      options: [{ value: 0, label: "No hay almacenes activos en esta sucursal" }],
      disabled: true,
    });
  });

  test("el guardado que ya no está en el catálogo se sigue mostrando", () => {
    const state = almacenSelectState({
      almacenes,
      sucursalId: 99,
      emptyLabel: "Sin almacén",
      selected: { value: 77, label: "INACTIVO" },
    });
    expect(state.disabled).toBe(false);
    expect(state.options).toEqual([
      { value: 0, label: "Sin almacén" },
      { value: 77, label: "INACTIVO" },
    ]);
  });

  test("el guardado que sí está en la lista no se duplica", () => {
    const state = almacenSelectState({
      almacenes,
      sucursalId: 10,
      emptyLabel: "Sin almacén",
      selected: { value: 1, label: "MATRIZ" },
    });
    expect(state.options.filter((o) => o.value === 1)).toHaveLength(1);
  });
});

test.describe("almacenPutPatch", () => {
  test("sin cambios no se manda (ni el guardado ni la ausencia)", () => {
    expect(almacenPutPatch(5, 5)).toEqual({});
    expect(almacenPutPatch(0, null)).toEqual({});
  });

  test("un cambio se manda; quitarlo viaja como null, nunca 0", () => {
    expect(almacenPutPatch(6, 5)).toEqual({ almacen: 6 });
    expect(almacenPutPatch(6, null)).toEqual({ almacen: 6 });
    expect(almacenPutPatch(0, 5)).toEqual({ almacen: null });
  });
});

test.describe("almacenPreseleccionado", () => {
  const opciones = [{ id_almacen: 1 }, { id_almacen: 2 }];

  test("el de la OC solo si está entre las opciones", () => {
    expect(almacenPreseleccionado(2, opciones)).toBe(2);
    expect(almacenPreseleccionado(3, opciones)).toBe(0);
  });

  test("sin almacén en la OC: nada preseleccionado", () => {
    expect(almacenPreseleccionado(null, opciones)).toBe(0);
    expect(almacenPreseleccionado(undefined, opciones)).toBe(0);
  });
});

test("optionalText: vacío o solo espacios cuenta como ausente", () => {
  expect(optionalText("")).toBeNull();
  expect(optionalText("   ")).toBeNull();
  expect(optionalText(null)).toBeNull();
  expect(optionalText(undefined)).toBeNull();
  expect(optionalText(" 555 ")).toBe("555");
});
