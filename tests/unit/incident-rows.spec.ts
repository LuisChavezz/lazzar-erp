import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { ALL_FILTER_OPTION, EMPTY_VALUE_FILTER_VALUE } from "@/src/utils/columnFilterOptions";
import {
  getColumns,
  INCIDENT_HEADER_FILTERS,
  type IncidentRow,
} from "@/src/features/incidents/components/IncidentColumns";
import {
  buildIncidentRows,
  getIncidentEstadoText,
  getIncidentGravedadText,
  getIncidentTipoText,
  getStaleIncidentToggleNotice,
} from "@/src/features/incidents/utils/incidentRows";
import type { Incident } from "@/src/features/incidents/interfaces/incident.interface";
import type { User } from "@/src/features/users/interfaces/user.interface";

/**
 * Pruebas unitarias de EC-637 sobre el listado de incidencias: sus DOS estatus
 * (`activo` del registro, punto junto al nombre; `estado` de negocio, badge en
 * su columna), cada uno con su filtro de encabezado y su ficha; tipo y
 * gravedad con su catálogo; los códigos fuera de catálogo; el reportante sin
 * valor; y el cierre de la confirmación de baja/reactivación. Se leen el
 * `filterFn`, el accessor y las props del `FilterHeader`, sin renderizar nada.
 */

const incident = (id: number, overrides: Partial<Incident> = {}): Incident => ({
  id,
  activo: true,
  empleado: 1,
  tipo: "retardo",
  gravedad: "baja",
  estado: "abierto",
  fecha: "2026-10-05",
  descripcion: "",
  acciones_tomadas: null,
  reportado_por: 7,
  fecha_reporte: "2026-10-05T10:00:00-06:00",
  ...overrides,
});

const rows = buildIncidentRows(
  [
    incident(1),
    // Registro dado de baja con estado de negocio "abierto": los dos estatus
    // son independientes.
    incident(2, { activo: false, empleado: 2, gravedad: "alta", reportado_por: null }),
    incident(3, { estado: "cerrado", tipo: "falta", empleado: 99, fecha: "2026-09-12" }),
    // Códigos que el catálogo del front no conoce.
    incident(4, {
      estado: "escalado" as Incident["estado"],
      tipo: "acoso" as Incident["tipo"],
      gravedad: "critica" as Incident["gravedad"],
    }),
  ],
  new Map([
    [1, "ANA PÉREZ"],
    [2, "LUIS GÓMEZ"],
  ]),
  new Map([[7, { id: 7, username: "rh", first_name: "Rosa", last_name: "Hdz" } as User]]),
  false,
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canDelete: false }) as ColumnDef<IncidentRow, unknown>[],
  rows,
  INCIDENT_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: IncidentRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const headerFilter = column(id).meta?.headerFilter;
  if (!headerFilter) throw new Error(`sin filtro de encabezado ${id}`);
  return headerFilter;
};

const cellText = (id: string, row: IncidentRow) =>
  (column(id) as { accessorFn: (row: IncidentRow, index: number) => unknown }).accessorFn(row, 0);

test.describe("buildIncidentRows", () => {
  test("resuelve el empleado y rotula `Empleado #N` al que no está en el catálogo", () => {
    expect(rows.map((r) => r.empleado_nombre)).toEqual(["ANA PÉREZ", "LUIS GÓMEZ", "Empleado #99", "ANA PÉREZ"]);
  });

  test("el reportante es siempre texto: \"—\" sin reportante", () => {
    expect(rows[1].reportado_por_nombre).toBe("—");
    expect(rows[0].reportado_por_nombre).not.toBe("—");
  });
});

test.describe("incidencias › columnas", () => {
  test("el empleado es la primera columna; sin Estatus ni Acciones aparte", () => {
    expect(columns.map((c) => c.id)).toEqual([
      "empleado",
      "fecha",
      "tipo",
      "gravedad",
      "estado",
      "descripcion",
      "acciones_tomadas",
      "reportado_por",
      "fecha_reporte",
    ]);
  });
});

test.describe("incidencias › filtro de `activo` (registro) en el nombre", () => {
  test("filtra por el registro, no por el `estado` de negocio", () => {
    expect(matching("empleado", "si")).toEqual([1, 3, 4]);
    expect(matching("empleado", "no")).toEqual([2]);
  });

  test("su ficha se titula \"Registro\" y el embudo lo nombra", () => {
    expect(column("empleado").meta?.filterLabel).toBe("Registro");
    expect(headerProps("empleado").label).toBe("registro");
    expect(headerProps("empleado").options).toEqual([
      ALL_FILTER_OPTION,
      { value: "si", label: "Activo" },
      { value: "no", label: "Inactivo" },
    ]);
  });
});

test.describe("incidencias › filtro de `estado` (negocio) en su columna", () => {
  test("compara contra el código crudo, sin mezclarse con `activo`", () => {
    expect(matching("estado", "abierto")).toEqual([1, 2]);
    expect(matching("estado", "cerrado")).toEqual([3]);
    expect(matching("estado", "escalado")).toEqual([4]);
  });

  test("su ficha se titula con la columna (\"Estado\"), distinta de la del registro", () => {
    expect(column("estado").meta?.filterLabel).toBeUndefined();
    expect(column("estado").meta?.label).toBe("Estado");
  });

  test("el catálogo completo en su orden (con su punto) y al final el código desconocido, crudo", () => {
    const options = headerProps("estado").options;
    expect(options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["abierto", "Abierto"],
      ["cerrado", "Cerrado"],
      ["escalado", "escalado"],
    ]);
    expect(options[1].dotClassName).toBe("bg-sky-500");
  });

  test("la celda (búsqueda y orden) lee el mismo texto que la opción, también fuera de catálogo", () => {
    expect(cellText("estado", rows[2])).toBe("Cerrado");
    expect(cellText("estado", rows[3])).toBe("escalado");
    expect(getIncidentEstadoText(null)).toBe("—");
  });
});

test.describe("incidencias › tipo y gravedad", () => {
  test("cada uno ofrece su catálogo completo y al final el código desconocido, crudo", () => {
    expect(headerProps("tipo").options.map((o) => o.label)).toEqual([
      "Todos",
      "Retardo",
      "Falta",
      "Actitud",
      "Otro",
      "acoso",
    ]);
    expect(headerProps("gravedad").options.map((o) => o.label)).toEqual([
      "Todos",
      "Baja",
      "Media",
      "Alta",
      "critica",
    ]);
  });

  test("filtran por el código crudo y su celda lee el mismo texto", () => {
    expect(matching("tipo", "falta")).toEqual([3]);
    expect(matching("gravedad", "alta")).toEqual([2]);
    expect(matching("gravedad", "critica")).toEqual([4]);
    expect(cellText("tipo", rows[3])).toBe("acoso");
    expect(getIncidentTipoText("actitud")).toBe("Actitud");
    expect(getIncidentGravedadText("critica")).toBe("critica");
  });
});

test.describe("incidencias › reportante y fechas", () => {
  test("el reportante agrupa primero las incidencias sin reportante", () => {
    const options = headerProps("reportado_por").options;
    expect(options[1]).toEqual({ value: EMPTY_VALUE_FILTER_VALUE, label: "Sin reportante" });
    expect(matching("reportado_por", EMPTY_VALUE_FILTER_VALUE)).toEqual([2]);
    expect(matching("reportado_por", "7")).toEqual([1, 3, 4]);
  });

  test("la fecha filtra por mes", () => {
    expect(headerProps("fecha").options.map((o) => o.label)).toEqual(["Todos", "Octubre 2026", "Septiembre 2026"]);
    expect(matching("fecha", "2026-09")).toEqual([3]);
  });
});

test.describe("incidencias › cierre de la confirmación de baja/reactivación", () => {
  test("dar de baja: sigue abierta mientras el registro está activo", () => {
    expect(
      getStaleIncidentToggleNotice({ targetId: 1, target: { activo: true }, expectedActivo: true, isBusy: false }),
    ).toBeNull();
  });

  test("dar de baja: se cierra con aviso si otra persona ya lo dio de baja", () => {
    expect(
      getStaleIncidentToggleNotice({ targetId: 1, target: { activo: false }, expectedActivo: true, isBusy: false }),
    ).toEqual({
      key: "incident-stale-1-false",
      message: "El registro de la incidencia cambió: ya está inactivo. Se actualizó el listado.",
    });
  });

  test("reactivar: compara contra el `activo` de APERTURA (false)", () => {
    expect(
      getStaleIncidentToggleNotice({ targetId: 2, target: { activo: false }, expectedActivo: false, isBusy: false }),
    ).toBeNull();
    expect(
      getStaleIncidentToggleNotice({ targetId: 2, target: { activo: true }, expectedActivo: false, isBusy: false })
        ?.key,
    ).toBe("incident-stale-2-true");
  });

  test("con el toggle propio en vuelo no avisa, aunque el optimista ya lo muestre invertido", () => {
    expect(
      getStaleIncidentToggleNotice({ targetId: 1, target: { activo: false }, expectedActivo: true, isBusy: true }),
    ).toBeNull();
  });

  test("se cierra con aviso si la incidencia ya no existe", () => {
    expect(
      getStaleIncidentToggleNotice({ targetId: 3, target: null, expectedActivo: true, isBusy: false }),
    ).toEqual({ key: "incident-stale-3-gone", message: "La incidencia ya no existe. Se actualizó el listado." });
  });
});
