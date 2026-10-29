import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import {
  getColumns,
  PAYROLL_HEADER_FILTERS,
  type PayrollRow,
} from "@/src/features/payroll/components/PayrollColumns";
import { buildPayrollRows, getPayrollStaleNotice } from "@/src/features/payroll/utils/payrollRows";
import type { Payroll } from "@/src/features/payroll/interfaces/payroll.interface";

/**
 * Pruebas unitarias de EC-636 sobre nóminas: estatus en su columna con su
 * filtro, empleado y sucursal con opciones de las filas (respaldo `#N` compartido con la
 * celda), fecha de pago con su grupo "sin pagar" y el cierre con aviso de
 * pagar / cancelar.
 */

const payroll = (id: number, overrides: Partial<Payroll> = {}): Payroll => ({
  id,
  empresa: 1,
  sucursal: 3,
  empleado: 1,
  periodo_inicio: "2026-10-01",
  periodo_fin: "2026-10-15",
  fecha_pago: null,
  estado: "pendiente",
  salario_base: "15000.00",
  dias_pagados: 15,
  horas_extra_pagadas: "0.00",
  observaciones: null,
  total_percepciones: "7500.00",
  total_deducciones: "0.00",
  neto: "7500.00",
  creado_por: null,
  fecha_generacion: "2026-10-01T10:00:00Z",
  detalles: [],
  ...overrides,
});

const rows = buildPayrollRows(
  [
    payroll(1),
    payroll(2, { estado: "pagada", fecha_pago: "2026-10-15", sucursal: 44 }),
    payroll(3, { estado: "en_revision" as Payroll["estado"], empleado: 99 }),
  ],
  new Map([[1, "ANA PÉREZ"]]),
  new Map([[3, "MATRIZ"]]),
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canPayOrCancel: false }) as ColumnDef<PayrollRow, unknown>[],
  rows,
  PAYROLL_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: PayrollRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const headerFilter = column(id).meta?.headerFilter;
  if (!headerFilter) throw new Error(`sin filtro de encabezado ${id}`);
  return headerFilter;
};

test.describe("nóminas › columnas y filtros", () => {
  test("el empleado es la primera columna, Estado tiene la suya, sin Acciones aparte", () => {
    expect(columns[0].id).toBe("empleado");
    expect(columns.map((c) => c.id)).toContain("estado");
    expect(columns.map((c) => c.id)).not.toContain("actions");
  });

  test("estatus: catálogo completo y el código desconocido al final, crudo", () => {
    expect(column("estado").meta?.filterLabel).toBe("Estatus");
    expect(headerProps("estado").options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["pendiente", "Pendiente"],
      ["pagada", "Pagada"],
      ["cancelada", "Cancelada"],
      ["en_revision", "en_revision"],
    ]);
    expect(matching("estado", "pagada")).toEqual([2]);
  });

  test("sucursal: opciones de las filas con el mismo `#N` que la celda", () => {
    expect(headerProps("sucursal_nombre").options.map((o) => o.label)).toEqual(["Todos", "MATRIZ", "Sucursal #44"]);
    expect(matching("sucursal_nombre", "44")).toEqual([2]);
    expect(rows[2].empleado_nombre).toBe("Empleado #99");
  });

  test("fecha de pago: por mes y aparte las que no tienen fecha", () => {
    const options = headerProps("fecha_pago").options;
    expect(options.map((o) => o.label)).toEqual(["Todos", "Octubre 2026", "Sin fecha de pago"]);
    expect(matching("fecha_pago", options[2].value as string)).toEqual([1, 3]);
  });
});

test.describe("nóminas › filtro de empleado", () => {
  test("opciones de las filas con el mismo `#N` que la celda, con buscador", () => {
    expect(headerProps("empleado").options.map((o) => o.label)).toEqual(["Todos", "ANA PÉREZ", "Empleado #99"]);
    expect(column("empleado").meta?.filterLabel).toBeUndefined();
  });

  test("filtra por el FK y se combina con el de estatus", () => {
    expect(matching("empleado", "1")).toEqual([1, 2]);
    const both = rows.filter(
      (original) =>
        (column("empleado").filterFn as unknown as FilterFn)({ original }, "empleado", "1") &&
        (column("estado").filterFn as unknown as FilterFn)({ original }, "estado", "pagada"),
    );
    expect(both.map((r) => r.id)).toEqual([2]);
  });
});

test.describe("nóminas › cierre de pagar y cancelar", () => {
  test("sigue abierto mientras la nómina está pendiente", () => {
    expect(getPayrollStaleNotice(1, { estado: "pendiente" }, false)).toBeNull();
  });

  test("otra persona ya la pagó: aviso con el estado nuevo", () => {
    expect(getPayrollStaleNotice(1, { estado: "pagada" }, false)).toEqual({
      key: "payroll-stale-1-pagada",
      message: "La nómina ya no está pendiente (ahora: «Pagada»). Se actualizó el listado.",
    });
  });

  test("ya no existe: aviso de inexistente", () => {
    expect(getPayrollStaleNotice(1, null, false)?.key).toBe("payroll-stale-1-gone");
  });

  test("con la guarda o la escritura propia en vuelo no avisa", () => {
    expect(getPayrollStaleNotice(1, { estado: "cancelada" }, true)).toBeNull();
  });
});
