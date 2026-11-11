import { expect, test } from "@playwright/test";
import { extractAuditCursor } from "@/src/features/document-audit/utils/auditCursor";
import {
  isValidTimelineTarget,
  toDocumentAuditParams,
} from "@/src/features/document-audit/schemas/documentAuditFilters.schema";
import { DOCUMENT_AUDIT_TABLE } from "@/src/features/document-audit/constants/documentAuditTable";
import { readServerTableState } from "@/src/utils/serverTableParams";

/**
 * EC-854 / EC-862: la bitácora responde 400 a un parámetro inválido e ignora
 * `ordering` y `search`. El frontend descarta antes esos valores: un enlace con
 * un filtro roto se lee como si no lo trajera, en vez de terminar en error.
 */
test.describe("toDocumentAuditParams", () => {
  test("omite los vacíos y recorta el folio", () => {
    expect(toDocumentAuditParams({})).toEqual({});
    expect(toDocumentAuditParams({ folio: "   " })).toEqual({});
    expect(
      toDocumentAuditParams({
        tipo: "pedido",
        accion: "estatus",
        usuario: 7,
        sucursal: 3,
        fecha_desde: "2026-11-01",
        fecha_hasta: "2026-11-11",
        folio: " PED-12 ",
      }),
    ).toEqual({
      tipo: "pedido",
      accion: "estatus",
      usuario: "7",
      sucursal: "3",
      fecha_desde: "2026-11-01",
      fecha_hasta: "2026-11-11",
      folio: "PED-12",
    });
  });

  test("rechaza lo que el backend respondería con 400 o que no coincide con nada", () => {
    expect(toDocumentAuditParams({ usuario: 0 })).toBeNull();
    expect(toDocumentAuditParams({ sucursal: 1.5 })).toBeNull();
    expect(toDocumentAuditParams({ sucursal: 2_147_483_648 })).toBeNull();
    expect(toDocumentAuditParams({ fecha_desde: "2026-13-01" })).toBeNull();
    expect(toDocumentAuditParams({ fecha_hasta: "11/11/2026" })).toBeNull();
    expect(toDocumentAuditParams({ fecha_desde: "2026-11-12", fecha_hasta: "2026-11-11" })).toBeNull();
    expect(toDocumentAuditParams({ tipo: "cotizacion" as never })).toBeNull();
    expect(toDocumentAuditParams({ accion: "borrar" as never })).toBeNull();
    expect(toDocumentAuditParams({ folio: "x".repeat(61) })).toBeNull();
  });

  test("nunca acepta ordering ni search", () => {
    expect(toDocumentAuditParams({ ordering: "folio" } as never)).toBeNull();
    expect(toDocumentAuditParams({ search: "x" } as never)).toBeNull();
  });
});

test.describe("filtros de la URL", () => {
  const read = (query: string) => {
    const params = new URLSearchParams(query);
    return readServerTableState(DOCUMENT_AUDIT_TABLE, (key) => params.get(key)).filters;
  };

  test("cada valor inválido se descarta por separado", () => {
    expect(read("tipo=pedido&usuario=abc&sucursal=3&fecha_desde=2026-02-30&folio=%20")).toEqual({
      tipo: "pedido",
      sucursal: 3,
    });
    expect(read("sucursal=99999999999&origen_id=4&ordering=folio&search=x")).toEqual({});
  });

  test("el folio sigue la misma regla en la URL y en el esquema", () => {
    expect(read(`folio=${"x".repeat(61)}`)).toEqual({});
    expect(read("folio=%20PED%201%20")).toEqual({ folio: "PED 1" });
    expect(toDocumentAuditParams(read("folio=%20PED%201%20"))).toEqual({ folio: "PED 1" });
  });

  test("un rango invertido descarta ambos extremos", () => {
    expect(read("fecha_desde=2026-11-12&fecha_hasta=2026-11-11&accion=crear")).toEqual({
      accion: "crear",
    });
  });

  test("lo leído de la URL siempre produce parámetros válidos", () => {
    const filters = read("tipo=factura&accion=baja&usuario=2&fecha_desde=2026-01-01&folio=FAC");
    expect(toDocumentAuditParams(filters)).not.toBeNull();
  });
});

test.describe("extractAuditCursor", () => {
  test("toma solo el cursor del next absoluto", () => {
    expect(
      extractAuditCursor(
        "https://nucleo-erp.vercel.app/api/v1/auditoria/documentos/?cursor=cD00ODY%3D&limit=50&tipo=pedido",
      ),
    ).toBe("cD00ODY=");
    expect(extractAuditCursor("/api/v1/auditoria/documentos/?cursor=abc")).toBe("abc");
  });

  test("sin next o sin cursor no hay página siguiente", () => {
    expect(extractAuditCursor(null)).toBeNull();
    expect(extractAuditCursor("")).toBeNull();
    expect(extractAuditCursor("https://x.test/api/v1/auditoria/documentos/?limit=50")).toBeNull();
  });
});

test.describe("isValidTimelineTarget", () => {
  test("exige tipo y un id positivo", () => {
    expect(isValidTimelineTarget("pedido", 12)).toBe(true);
    expect(isValidTimelineTarget("", 12)).toBe(false);
    expect(isValidTimelineTarget("pedido", 0)).toBe(false);
    expect(isValidTimelineTarget("pedido", Number.NaN)).toBe(false);
  });
});
