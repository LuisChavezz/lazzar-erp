import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { EMPTY_VALUE_FILTER_VALUE } from "@/src/utils/columnFilterOptions";
import {
  getColumns,
  TRAINING_HEADER_FILTERS,
  type TrainingRow,
} from "@/src/features/trainings/components/TrainingColumns";
import { buildTrainingRows, TRAINING_STALE_MESSAGES } from "@/src/features/trainings/utils/trainingRows";
import type { Training } from "@/src/features/trainings/interfaces/training.interface";

/**
 * Pruebas unitarias de EC-637 sobre el listado de capacitaciones: el nombre de
 * la capacitación es el menú y filtra por su `estado` (regla de los
 * catálogos); el empleado tiene su propio filtro; y el diálogo de eliminar se
 * cierra con aviso solo si la capacitación desaparece (no hay baja lógica).
 */

const training = (id: number, overrides: Partial<Training> = {}): Training => ({
  id,
  empleado: 1,
  nombre: `Curso ${id}`,
  institucion: "",
  fecha_inicio: "2026-10-01",
  fecha_fin: null,
  horas: null,
  estado: "inscrito",
  calificacion: null,
  constancia_url: null,
  ...overrides,
});

const rows = buildTrainingRows(
  [
    training(1, { institucion: "CONOCER" }),
    training(2, { estado: "finalizado", empleado: 2, constancia_url: "https://x.mx/c.pdf", fecha_fin: "2026-10-20" }),
    training(3, { estado: "cancelado", empleado: 99 }),
    training(4, { estado: "pospuesto" as Training["estado"] }),
  ],
  new Map([
    [1, "ANA PÉREZ"],
    [2, "LUIS GÓMEZ"],
  ]),
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canDelete: false }) as ColumnDef<TrainingRow, unknown>[],
  rows,
  TRAINING_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id || (c as { accessorKey?: string }).accessorKey === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: TrainingRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const headerFilter = column(id).meta?.headerFilter;
  if (!headerFilter) throw new Error(`sin filtro de encabezado ${id}`);
  return headerFilter;
};

test.describe("buildTrainingRows", () => {
  test("resuelve el empleado y rotula `Empleado #N` al que no está en el catálogo", () => {
    expect(rows.map((r) => r.empleado_nombre)).toEqual(["ANA PÉREZ", "LUIS GÓMEZ", "Empleado #99", "ANA PÉREZ"]);
  });
});

test.describe("capacitaciones › columnas", () => {
  test("el nombre de la capacitación es la primera columna; sin Estado ni Acciones aparte", () => {
    const ids = columns.map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey);
    expect(ids).toEqual([
      "nombre",
      "empleado",
      "institucion",
      "fecha_inicio",
      "fecha_fin",
      "horas",
      "calificacion",
      "constancia_url",
    ]);
  });
});

test.describe("capacitaciones › filtro de estatus en el nombre", () => {
  test("su ficha se titula \"Estatus\" y el embudo lo nombra, bajo el título de la columna", () => {
    expect(column("nombre").meta?.filterLabel).toBe("Estatus");
    expect(headerProps("nombre").label).toBe("estatus");
    expect(headerProps("nombre").title).toBe("Capacitación");
  });

  test("el catálogo completo en su orden y al final el código desconocido, crudo", () => {
    expect(headerProps("nombre").options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["inscrito", "Inscrito"],
      ["en_curso", "En curso"],
      ["finalizado", "Finalizado"],
      ["cancelado", "Cancelado"],
      ["pospuesto", "pospuesto"],
    ]);
  });

  test("filtra por el código crudo del estado", () => {
    expect(matching("nombre", "inscrito")).toEqual([1]);
    expect(matching("nombre", "finalizado")).toEqual([2]);
    expect(matching("nombre", "pospuesto")).toEqual([4]);
  });
});

test.describe("capacitaciones › búsqueda y orden del nombre", () => {
  type Accessor = { accessorFn: (row: TrainingRow, index: number) => unknown };
  type SortFn = (a: { original: TrainingRow }, b: { original: TrainingRow }, columnId: string) => number;

  test("la búsqueda global lee también la etiqueta del estado (o el código crudo)", () => {
    const value = (row: TrainingRow) => (column("nombre") as unknown as Accessor).accessorFn(row, 0);
    expect(value(rows[2])).toBe("Curso 3 Cancelado");
    expect(value(rows[3])).toBe("Curso 4 pospuesto");
  });

  test("el orden sigue solo por el nombre, sin importar el estado", () => {
    const sortingFn = column("nombre").sortingFn as unknown as SortFn;
    const a = { original: { ...rows[0], nombre: "CURSO 2", estado: "inscrito" as const } };
    const b = { original: { ...rows[0], nombre: "CURSO 10", estado: "cancelado" as const } };
    // Alfanumérico: 2 < 10, aunque "Cancelado" < "Inscrito".
    expect(sortingFn(a, b, "nombre")).toBeLessThan(0);
  });
});

test.describe("capacitaciones › otros filtros", () => {
  test("empleado: por el FK, rotulado con el mismo `#N` que la celda, con buscador", () => {
    expect(headerProps("empleado").options.map((o) => o.label)).toEqual(["Todos", "ANA PÉREZ", "Empleado #99", "LUIS GÓMEZ"]);
    expect(headerProps("empleado").searchable).toBeTruthy();
    expect(matching("empleado", "1")).toEqual([1, 4]);
  });

  test("institución: primero las que no tienen", () => {
    expect(headerProps("institucion").options[1]).toEqual({ value: EMPTY_VALUE_FILTER_VALUE, label: "Sin institución" });
    expect(matching("institucion", EMPTY_VALUE_FILTER_VALUE)).toEqual([2, 3, 4]);
    expect(matching("institucion", "CONOCER")).toEqual([1]);
  });

  test("constancia: con o sin ella", () => {
    expect(matching("constancia_url", "con")).toEqual([2]);
    expect(matching("constancia_url", "sin")).toEqual([1, 3, 4]);
  });

  test("el fin agrupa aparte las que no tienen fecha de término", () => {
    expect(headerProps("fecha_fin").options.map((o) => o.label)).toEqual(["Todos", "Octubre 2026", "Sin fecha de fin"]);
  });
});

test.describe("capacitaciones › cierre del diálogo de eliminar", () => {
  const notice = (target: object | null, isBusy: boolean) =>
    getStaleRowDialogNotice({
      resource: "training",
      targetId: 1,
      target,
      isBusy,
      messages: TRAINING_STALE_MESSAGES,
    });

  test("sigue abierto mientras la capacitación exista, cambie o no su estado", () => {
    expect(notice({ estado: "cancelado" }, false)).toBeNull();
  });

  test("se cierra con aviso si otra persona la borró", () => {
    expect(notice(null, false)).toEqual({
      key: "training-stale-1-gone",
      message: "La capacitación ya no existe. Se actualizó el listado.",
    });
  });

  test("con el borrado propio en vuelo no avisa, aunque el optimista ya la sacó", () => {
    expect(notice(null, true)).toBeNull();
  });
});
