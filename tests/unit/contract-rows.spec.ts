import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { ALL_FILTER_OPTION, type ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import { CONTRACT_HEADER_FILTERS, getColumns, type ContractRow } from "@/src/features/contracts/components/ContractColumns";
import {
  buildContractRows,
  getContractEstadoText,
  getContractTipoText,
} from "@/src/features/contracts/utils/contractRows";
import type { Contract } from "@/src/features/contracts/interfaces/contract.interface";

/**
 * Pruebas unitarias de EC-635 sobre el listado de contratos: sus DOS estatus
 * (`activo` del registro, punto junto al nombre; `estado` de negocio, badge en
 * su columna), cada uno con su filtro de encabezado y su ficha; los códigos
 * fuera de catálogo; y el rótulo `#N` del empleado. Se leen el `filterFn`, el
 * accessor y las props del `FilterHeader`, sin renderizar nada.
 */

const contract = (id: number, overrides: Partial<Contract> = {}): Contract =>
  ({
    id,
    activo: true,
    empleado: 1,
    tipo: "indefinido",
    fecha_inicio: "2026-01-15",
    fecha_fin: null,
    salario: "12000.00",
    estado: "activo",
    archivo_url: null,
    creado_por: null,
    observaciones: null,
    prestaciones: null,
    ...overrides,
  }) as Contract;

const rows = buildContractRows(
  [
    contract(1),
    // Registro dado de baja con estado de negocio "activo": los dos estatus
    // son independientes aunque compartan el literal.
    contract(2, { activo: false, estado: "activo", empleado: 2 }),
    contract(3, { estado: "terminado", fecha_fin: "2026-06-30", empleado: 99 }),
    // Códigos que el catálogo del front no conoce.
    contract(4, { estado: "suspendido" as Contract["estado"], tipo: "honorarios" as Contract["tipo"] }),
  ],
  new Map([
    [1, "ANA PÉREZ"],
    [2, "LUIS GÓMEZ"],
  ]),
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canDelete: false }) as ColumnDef<ContractRow, unknown>[],
  rows,
  CONTRACT_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: ContractRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const header = column(id).header as (context: { column: unknown }) => {
    props: { options: ColumnFilterOption[]; label: string; title: string };
  };
  return header({ column: {} }).props;
};

const cellText = (id: string, row: ContractRow) =>
  (column(id) as { accessorFn: (row: ContractRow, index: number) => unknown }).accessorFn(row, 0);

test.describe("buildContractRows", () => {
  test("resuelve el empleado y rotula `Empleado #N` al que no está en el catálogo", () => {
    expect(rows.map((r) => r.empleado_nombre)).toEqual(["ANA PÉREZ", "LUIS GÓMEZ", "Empleado #99", "ANA PÉREZ"]);
  });
});

test.describe("contratos › filtro de `activo` (registro) en el nombre", () => {
  test("filtra por el registro, no por el `estado` de negocio", () => {
    expect(matching("empleado", "si")).toEqual([1, 3, 4]);
    expect(matching("empleado", "no")).toEqual([2]);
  });

  test("su ficha se titula \"Registro\" y el embudo lo nombra", () => {
    expect(column("empleado").meta?.filterLabel).toBe("Registro");
    expect(headerProps("empleado").label).toBe("registro");
    expect(headerProps("empleado").title).toBe("Empleado");
    expect(headerProps("empleado").options).toEqual([
      ALL_FILTER_OPTION,
      { value: "si", label: "Activo" },
      { value: "no", label: "Inactivo" },
    ]);
  });
});

test.describe("contratos › filtro de `estado` (negocio) en su columna", () => {
  test("compara contra el código crudo, sin mezclarse con `activo`", () => {
    expect(matching("estado", "activo")).toEqual([1, 2]);
    expect(matching("estado", "terminado")).toEqual([3]);
    expect(matching("estado", "suspendido")).toEqual([4]);
  });

  test("su ficha se titula con la columna (\"Estado\"): las dos fichas \"Activo\" se distinguen", () => {
    expect(column("estado").meta?.filterLabel).toBeUndefined();
    expect(column("estado").meta?.label).toBe("Estado");
    expect(column("estado").meta?.label).not.toBe(column("empleado").meta?.filterLabel);
  });

  test("el catálogo completo en su orden (con su punto) y al final el código desconocido, crudo", () => {
    const options = headerProps("estado").options;
    expect(options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["activo", "Activo"],
      ["terminado", "Terminado"],
      ["renovado", "Renovado"],
      ["suspendido", "suspendido"],
    ]);
    expect(options[1].dotClassName).toBe("bg-emerald-500");
  });

  test("la celda (búsqueda y orden) lee el mismo texto que la opción, también fuera de catálogo", () => {
    expect(cellText("estado", rows[2])).toBe("Terminado");
    expect(cellText("estado", rows[3])).toBe("suspendido");
    expect(getContractEstadoText(null)).toBe("—");
  });
});

test.describe("contratos › filtro de `tipo`", () => {
  test("catálogo completo y el código desconocido al final, crudo como su celda", () => {
    expect(headerProps("tipo").options.map((o) => o.label)).toEqual([
      "Todos",
      "Indefinido",
      "Tiempo determinado",
      "Periodo de prueba",
      "honorarios",
    ]);
    expect(cellText("tipo", rows[3])).toBe("honorarios");
    expect(getContractTipoText("prueba")).toBe("Periodo de prueba");
  });

  test("filtra por el código crudo", () => {
    expect(matching("tipo", "honorarios")).toEqual([4]);
    expect(matching("tipo", "indefinido")).toEqual([1, 2, 3]);
  });
});

test.describe("contratos › fechas", () => {
  test("el fin agrupa aparte los contratos sin fecha de término", () => {
    const labels = headerProps("fecha_fin").options.map((o) => o.label);
    expect(labels[0]).toBe("Todos");
    expect(labels.at(-1)).toBe("Sin fecha de fin");
    expect(labels).toHaveLength(3);
  });
});
