import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { EMPTY_VALUE_FILTER_VALUE } from "@/src/utils/columnFilterOptions";
import {
  EVALUATION_HEADER_FILTERS,
  getColumns,
  type EvaluationRow,
} from "@/src/features/evaluations/components/EvaluationColumns";
import {
  buildEvaluationRows,
  EVALUATION_STALE_MESSAGES,
  getEvaluationPeriodoText,
} from "@/src/features/evaluations/utils/evaluationRows";
import type { Evaluation } from "@/src/features/evaluations/interfaces/evaluation.interface";

/**
 * Pruebas unitarias de EC-637 sobre el listado de evaluaciones: el nombre del
 * evaluado es el menú y filtra por empleado; el estatus tiene su columna y su
 * filtro; tipo, periodo y evaluador sus propios filtros; y la confirmación de
 * eliminar se cierra con aviso cuando la evaluación deja de estar pendiente.
 */

const evaluation = (id: number, overrides: Partial<Evaluation> = {}): Evaluation => ({
  id,
  empleado: 1,
  evaluador: 2,
  tipo: "desempeno",
  periodo: "trimestral",
  estado: "pendiente",
  fecha: "2026-10-10",
  puntaje: null,
  comentarios: "",
  ...overrides,
});

const rows = buildEvaluationRows(
  [
    evaluation(1),
    evaluation(2, { estado: "completada", empleado: 2, evaluador: null, puntaje: "90.00", periodo: "anual" }),
    evaluation(3, { empleado: 99, tipo: "objetivo" }),
    evaluation(4, {
      estado: "archivada" as Evaluation["estado"],
      periodo: "mensual" as Evaluation["periodo"],
      tipo: "360" as Evaluation["tipo"],
    }),
  ],
  new Map([
    [1, "ANA PÉREZ"],
    [2, "LUIS GÓMEZ"],
  ]),
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canDelete: false }) as ColumnDef<EvaluationRow, unknown>[],
  rows,
  EVALUATION_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: EvaluationRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const headerFilter = column(id).meta?.headerFilter;
  if (!headerFilter) throw new Error(`sin filtro de encabezado ${id}`);
  return headerFilter;
};

const cellText = (id: string, row: EvaluationRow) =>
  (column(id) as { accessorFn: (row: EvaluationRow, index: number) => unknown }).accessorFn(row, 0);

test.describe("buildEvaluationRows", () => {
  test("resuelve evaluado y evaluador contra el mismo catálogo, con sus respaldos", () => {
    expect(rows.map((r) => r.empleado_nombre)).toEqual(["ANA PÉREZ", "LUIS GÓMEZ", "Empleado #99", "ANA PÉREZ"]);
    expect(rows.map((r) => r.evaluador_nombre)).toEqual(["LUIS GÓMEZ", "Sin evaluador", "LUIS GÓMEZ", "LUIS GÓMEZ"]);
  });
});

test.describe("evaluaciones › columnas", () => {
  test("el empleado es la primera columna; Estado en la suya, sin Acciones aparte", () => {
    expect(columns.map((c) => c.id)).toEqual([
      "empleado",
      "fecha",
      "evaluador",
      "tipo",
      "periodo",
      "estado",
      "puntaje",
      "comentarios",
    ]);
  });
});

test.describe("evaluaciones › filtro de empleado", () => {
  test("opciones de las filas con el mismo `#N` que la celda, con buscador", () => {
    expect(headerProps("empleado").options.map((o) => o.label)).toEqual(["Todos", "ANA PÉREZ", "Empleado #99", "LUIS GÓMEZ"]);
    expect(headerProps("empleado").searchable).toBeTruthy();
  });

  test("filtra por el FK y se combina con el de estatus", () => {
    expect(matching("empleado", "1")).toEqual([1, 4]);
    const both = rows.filter(
      (original) =>
        (column("empleado").filterFn as unknown as FilterFn)({ original }, "empleado", "1") &&
        (column("estado").filterFn as unknown as FilterFn)({ original }, "estado", "pendiente"),
    );
    expect(both.map((r) => r.id)).toEqual([1]);
  });
});

test.describe("evaluaciones › filtro de estatus", () => {
  test("su ficha se titula \"Estatus\" y ofrece el catálogo y al final el código desconocido, crudo", () => {
    expect(column("estado").meta?.filterLabel).toBe("Estatus");
    expect(headerProps("estado").options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["pendiente", "Pendiente"],
      ["completada", "Completada"],
      ["archivada", "archivada"],
    ]);
    expect(matching("estado", "completada")).toEqual([2]);
  });
});

test.describe("evaluaciones › tipo, periodo y evaluador", () => {
  test("tipo y periodo: su catálogo completo y al final el código desconocido, crudo como su celda", () => {
    expect(headerProps("tipo").options.map((o) => o.label)).toEqual([
      "Todos",
      "Desempeño",
      "Competencias",
      "Por objetivos",
      "360",
    ]);
    expect(headerProps("periodo").options.map((o) => o.label)).toEqual([
      "Todos",
      "Trimestral",
      "Semestral",
      "Anual",
      "mensual",
    ]);
    expect(cellText("periodo", rows[3])).toBe("mensual");
    expect(getEvaluationPeriodoText("anual")).toBe("Anual");
    expect(matching("tipo", "objetivo")).toEqual([3]);
    expect(matching("periodo", "anual")).toEqual([2]);
  });

  test("evaluador: primero las evaluaciones sin evaluador, luego por el FK", () => {
    expect(headerProps("evaluador").options[1]).toEqual({ value: EMPTY_VALUE_FILTER_VALUE, label: "Sin evaluador" });
    expect(matching("evaluador", EMPTY_VALUE_FILTER_VALUE)).toEqual([2]);
    expect(matching("evaluador", "2")).toEqual([1, 3, 4]);
  });
});

/** La regla de la vía rápida tal como la llama la lista. */
const staleNotice = (target: { estado: Evaluation["estado"] } | null, isBusy: boolean) =>
  getStaleRowDialogNotice({
    resource: "evaluation",
    targetId: 1,
    target,
    expectedEstado: "pendiente",
    isBusy,
    messages: EVALUATION_STALE_MESSAGES,
  });

test.describe("evaluaciones › cierre de la confirmación de eliminar", () => {
  test("sigue abierta mientras la evaluación esté pendiente", () => {
    expect(staleNotice({ estado: "pendiente" }, false)).toBeNull();
  });

  test("se cierra con aviso si otra persona ya la completó", () => {
    expect(staleNotice({ estado: "completada" }, false)).toEqual({
      key: "evaluation-stale-1-completada",
      message: "La evaluación cambió de estado: ya está completada y no se puede eliminar. Se actualizó el listado.",
    });
  });

  test("se cierra con aviso si la evaluación ya no existe; no, con el borrado propio en vuelo", () => {
    expect(staleNotice(null, false)?.key).toBe("evaluation-stale-1-gone");
    expect(staleNotice(null, true)).toBeNull();
  });
});
