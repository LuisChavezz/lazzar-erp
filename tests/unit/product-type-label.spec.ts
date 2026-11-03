import { expect, test } from "@playwright/test";
import type { ProductType } from "@/src/features/product-types/interfaces/product-type.interface";
import {
  getProductTypeLabel,
  getProductTypeLabelById,
} from "@/src/features/product-types/utils/productTypeLabel";

/**
 * EC-714: etiqueta visible del tipo de producto. El catálogo
 * (`/catalogo/tipo-producto/`) solo trae activos, así que un id ausente no se
 * puede afirmar como "dado de baja" (nucleo-erp #907).
 */

const PT: ProductType = { id: 3, codigo: "PT", nombre: "Producto terminado", activo: true };
const SIN_NOMBRE: ProductType = { id: 9, codigo: "QA", nombre: "   ", activo: true };
const catalogo = [PT, SIN_NOMBRE];
const listo = { isLoading: false, isError: false };

test("getProductTypeLabel usa el nombre", () => {
  expect(getProductTypeLabel(PT)).toBe("Producto terminado");
});

test("getProductTypeLabel cae al código si el nombre viene en blanco", () => {
  expect(getProductTypeLabel(SIN_NOMBRE)).toBe("QA");
  expect(getProductTypeLabel({ codigo: "MP", nombre: "" })).toBe("MP");
});

test("un tipo encontrado muestra su etiqueta aunque el catálogo esté cargando o haya fallado", () => {
  expect(getProductTypeLabelById(3, catalogo, listo)).toBe("Producto terminado");
  expect(getProductTypeLabelById(9, catalogo, listo)).toBe("QA");
  expect(getProductTypeLabelById(3, catalogo, { isLoading: true, isError: true })).toBe(
    "Producto terminado",
  );
});

test("un producto sin tipo (null) es '—', distinto de un id ausente", () => {
  expect(getProductTypeLabelById(null, catalogo, listo)).toBe("—");
  expect(getProductTypeLabelById(null, [], { isLoading: true, isError: true })).toBe("—");
  expect(getProductTypeLabelById(99, catalogo, listo)).not.toBe("—");
});

test("id ausente: cargando antes que error, y error antes que no disponible", () => {
  expect(getProductTypeLabelById(99, [], { isLoading: true, isError: true })).toBe("Cargando...");
  expect(getProductTypeLabelById(99, [], { isLoading: false, isError: true })).toBe(
    "No se pudo cargar el tipo",
  );
  expect(getProductTypeLabelById(99, catalogo, listo)).toBe("Tipo no disponible");
});
