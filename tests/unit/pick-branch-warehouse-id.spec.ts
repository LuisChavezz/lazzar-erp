import { expect, test } from "@playwright/test";
import {
  decideWarehousePreselection,
  INITIAL_WAREHOUSE_PRESELECTION,
  pickBranchWarehouseId,
  type WarehousePreselectionState,
} from "@/src/features/reports/utils/pickBranchWarehouseId";

/**
 * EC-626: los reportes preseleccionan el almacén de la sucursal del workspace
 * solo cuando es el único activo de esa sucursal.
 */
test.describe("pickBranchWarehouseId", () => {
  const w = (id_almacen: number, sucursal: number, estatus: "ACTIVO" | "INACTIVO" = "ACTIVO") => ({
    id_almacen,
    sucursal,
    estatus,
  });

  test("sin sucursal válida no preselecciona", () => {
    expect(pickBranchWarehouseId(null, [w(1, 61)])).toBeNull();
  });

  test("la sucursal con un solo almacén activo lo preselecciona", () => {
    expect(pickBranchWarehouseId(61, [w(1, 61), w(2, 7), w(3, 7)])).toBe(1);
  });

  test("con varios almacenes activos en la sucursal no elige ninguno", () => {
    expect(pickBranchWarehouseId(7, [w(1, 61), w(2, 7), w(3, 7)])).toBeNull();
  });

  test("los inactivos no cuentan: ni como candidato ni para el empate", () => {
    expect(pickBranchWarehouseId(7, [w(2, 7), w(3, 7, "INACTIVO")])).toBe(2);
    expect(pickBranchWarehouseId(7, [w(3, 7, "INACTIVO")])).toBeNull();
  });

  test("una sucursal sin almacenes no preselecciona", () => {
    expect(pickBranchWarehouseId(99, [w(1, 61)])).toBeNull();
  });
});

/**
 * EC-626 (revisión): la preselección se vuelve a decidir al cambiar de
 * sucursal, sin pisar una elección del usuario bajo la sucursal vigente.
 */
test.describe("decideWarehousePreselection", () => {
  const decided = (decidedFor: number | null, extra: Partial<WarehousePreselectionState> = {}) => ({
    decidedFor,
    manual: false,
    autoId: null,
    ...extra,
  });

  test("primera decisión: preselecciona el almacén único si no hay elección", () => {
    const r = decideWarehousePreselection(INITIAL_WAREHOUSE_PRESELECTION, 61, 1, null);
    expect(r.apply).toBe(1);
    expect(r.next).toEqual({ decidedFor: 61, manual: false, autoId: 1 });
  });

  test("primera decisión: no pisa una elección hecha mientras cargaba", () => {
    const manual = { ...INITIAL_WAREHOUSE_PRESELECTION, manual: true };
    expect(decideWarehousePreselection(manual, 61, 1, null).apply).toBeUndefined();
    expect(decideWarehousePreselection(INITIAL_WAREHOUSE_PRESELECTION, 61, 1, 9).apply).toBeUndefined();
  });

  test("misma sucursal: no hace nada, aunque el usuario haya cambiado el almacén", () => {
    const state = decided(61, { manual: true });
    const r = decideWarehousePreselection(state, 61, 1, 9);
    expect(r.apply).toBeUndefined();
    expect(r.next).toBe(state);
  });

  test("cambio a una sucursal con almacén único: lo fija", () => {
    const r = decideWarehousePreselection(decided(61, { autoId: 1 }), 7, 20, 1);
    expect(r.apply).toBe(20);
    expect(r.next).toEqual({ decidedFor: 7, manual: false, autoId: 20 });
  });

  test("cambio a una sucursal con varios almacenes: quita el que había puesto la preselección", () => {
    const r = decideWarehousePreselection(decided(61, { autoId: 1 }), 7, null, 1);
    expect(r.apply).toBeNull();
    expect(r.next.autoId).toBeNull();
  });

  test("cambio a una sucursal con varios almacenes: deja la elección del usuario", () => {
    const r = decideWarehousePreselection(decided(61, { manual: true }), 7, null, 9);
    expect(r.apply).toBeUndefined();
    expect(r.next).toEqual({ decidedFor: 7, manual: false, autoId: null });
  });

  test("la elección del usuario bajo la sucursal nueva ya no se pisa", () => {
    const afterSwitch = decideWarehousePreselection(decided(61), 7, 20, null).next;
    const userPicked = { ...afterSwitch, manual: true, autoId: null };
    expect(decideWarehousePreselection(userPicked, 7, 20, 9).apply).toBeUndefined();
  });
});
