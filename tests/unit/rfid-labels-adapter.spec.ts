import { expect, test } from "@playwright/test";
import { rfidLabelsAdapter } from "@/src/features/rfid-labels/utils/rfidLabelsAdapter";
import type { EtiquetaRFIDRow } from "@/src/features/rfid-labels/interfaces/rfid-label.interface";

/** EC-994: el historial RFID acepta el arreglo de hoy y la página de EC-989. */

const row = (id: number): EtiquetaRFIDRow => ({
  id,
  folio: `RFID-${id}`,
  empresa: 1,
  sucursal: 1,
  usuario: 1,
  producto: 1,
  producto_variante: 1,
  producto_nombre: "Camisa",
  producto_variante_nombre: "Camisa - Azul - M",
  sku: `SKU-${id}`,
  codigo_producto: "C-1",
  cantidad: 1,
  rfid_mode: true,
  printer_name: null,
  printer_address: null,
  status: "EXITO",
  observaciones: null,
  created_at: "2026-11-27T12:00:00Z",
  updated_at: "2026-11-27T12:00:00Z",
});

const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));

test("siempre manda limit/offset", () => {
  expect(rfidLabelsAdapter.paginationParams({ page: 3, pageSize: 20 })).toEqual({
    limit: 20,
    offset: 40,
  });
});

test("arreglo completo: total = longitud y recorta la página pedida", () => {
  const data = rows(45);
  const first = rfidLabelsAdapter.parse(data, { page: 1, pageSize: 20 });
  expect(first.total).toBe(45);
  expect(first.rows.map((r) => r.id)).toEqual(data.slice(0, 20).map((r) => r.id));
  expect(first.hasMore).toBe(true);

  const last = rfidLabelsAdapter.parse(data, { page: 3, pageSize: 20 });
  expect(last.rows.map((r) => r.id)).toEqual([41, 42, 43, 44, 45]);
  expect(last.hasMore).toBe(false);
});

test("arreglo vacío", () => {
  expect(rfidLabelsAdapter.parse([], { page: 1, pageSize: 20 })).toEqual({
    rows: [],
    total: 0,
    hasMore: false,
  });
});

test("página DRF: se lee tal cual, sin recortar", () => {
  const results = rows(20);
  const parsed = rfidLabelsAdapter.parse(
    { count: 45, next: "https://x/?limit=20&offset=40", previous: null, results },
    { page: 2, pageSize: 20 },
  );
  expect(parsed).toEqual({ rows: results, total: 45, hasMore: true });
});
