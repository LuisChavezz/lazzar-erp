import { expect, test } from "@playwright/test";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { ALL_FILTER_OPTION, EMPTY_VALUE_FILTER_VALUE } from "@/src/utils/columnFilterOptions";
import {
  CATEGORIA_LINEAS,
  getCategoriaLineaLabel,
  getLineaFormOptions,
  groupCategoriesByLinea,
  SIN_LINEA_LABEL,
  UNRECOGNIZED_LINEA_SUFFIX,
} from "@/src/features/product-categories/constants/categoriaLinea";
import {
  createProductCategoryFormSchema,
  ProductCategoryFormSchema,
} from "@/src/features/product-categories/schemas/product-category.schema";
import { normalizeProductCategory } from "@/src/features/product-categories/utils/normalizeProductCategory";
import { categoriaLineaHeaderFilter } from "@/src/features/product-categories/utils/categoriaLineaHeaderFilter";
import {
  buildProductRows,
  getColumns,
  productLineaHeaderFilter,
  SIN_CATEGORIA_O_INACTIVA_LABEL,
  type ProductRow,
} from "@/src/features/products/components/ProductColumns";
import type { Product } from "@/src/features/products/interfaces/product.interface";
import { harness } from "./support/headerFilterHarness";

test.describe("getCategoriaLineaLabel", () => {
  test("la etiqueta del backend para cada línea conocida", () => {
    expect(getCategoriaLineaLabel("ROPA_FRIO")).toBe("Ropa de frío");
    expect(getCategoriaLineaLabel("EPP")).toBe("EPP");
  });

  test("vacía o ausente = sin línea (materia prima)", () => {
    expect(getCategoriaLineaLabel("")).toBe(SIN_LINEA_LABEL);
    expect(getCategoriaLineaLabel(null)).toBe(SIN_LINEA_LABEL);
    expect(getCategoriaLineaLabel(undefined)).toBe(SIN_LINEA_LABEL);
  });

  test("una línea que el front no conoce se muestra cruda, no como materia prima", () => {
    expect(getCategoriaLineaLabel("NUEVA")).toBe("NUEVA");
  });
});

test.describe("groupCategoriesByLinea", () => {
  const cat = (id: number, linea: string) => ({ id, linea });

  test("grupos en el orden del catálogo, sin línea al final, conservando el orden interno", () => {
    const groups = groupCategoriesByLinea([
      cat(1, ""),
      cat(2, "EJECUTIVO"),
      cat(3, "INDUSTRIAL"),
      cat(4, "EJECUTIVO"),
      cat(5, "NUEVA"),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "Industrial",
      "Ejecutivo",
      "NUEVA",
      SIN_LINEA_LABEL,
    ]);
    expect(groups[1].categories.map((category) => category.id)).toEqual([2, 4]);
    expect(groups.at(-1)?.categories.map((category) => category.id)).toEqual([1]);
  });

  test("omite las líneas sin categorías", () => {
    expect(groupCategoriesByLinea([])).toEqual([]);
    expect(groupCategoriesByLinea([cat(1, "EPP")]).map((group) => group.key)).toEqual(["EPP"]);
  });
});

// --- EC-722, revisión: normalización, línea no reconocida, filas y filtros ---

test.describe("normalizeProductCategory", () => {
  const base = { id: 1, empresa: 1, nombre: "TELAS", codigo: "TEL", descripcion: "", tallas: [] };

  test("linea ausente o null pasa a \"\" (sin línea), sin tocar las demás", () => {
    expect(normalizeProductCategory(base).linea).toBe("");
    expect(normalizeProductCategory({ ...base, linea: null }).linea).toBe("");
    expect(normalizeProductCategory({ ...base, linea: "EPP" }).linea).toBe("EPP");
    expect(normalizeProductCategory({ ...base, linea: "NUEVA" }).linea).toBe("NUEVA");
  });

  test("una categoría sin el campo cae en el grupo de sin línea, no en uno aparte", () => {
    const groups = groupCategoriesByLinea(
      [{ ...base, id: 1 }, { ...base, id: 2, linea: "" }].map(normalizeProductCategory),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "sin-linea", label: SIN_LINEA_LABEL });
    expect(groups[0].categories.map((category) => category.id)).toEqual([1, 2]);
  });
});

test.describe("línea no reconocida en el formulario", () => {
  test("las opciones solo agregan la línea actual si el catálogo no la conoce, al final y marcada", () => {
    const known = getLineaFormOptions("EPP");
    expect(known.map((option) => option.value)).toEqual(["", ...CATEGORIA_LINEAS]);
    expect(known[0].label).toBe(SIN_LINEA_LABEL);
    expect(getLineaFormOptions("")).toEqual(known);
    expect(getLineaFormOptions(undefined)).toEqual(known);

    const unknown = getLineaFormOptions("DEPORTIVO");
    expect(unknown).toHaveLength(known.length + 1);
    expect(unknown.at(-1)).toEqual({ value: "DEPORTIVO", label: `DEPORTIVO ${UNRECOGNIZED_LINEA_SUFFIX}` });
  });

  test("el esquema acepta la línea no reconocida que ya tenía la categoría, y solo esa", () => {
    const values = { nombre: "X", codigo: "X1", descripcion: "X" };
    const editing = createProductCategoryFormSchema("DEPORTIVO");
    expect(editing.safeParse({ ...values, linea: "DEPORTIVO" }).success).toBe(true);
    expect(editing.safeParse({ ...values, linea: "EPP" }).success).toBe(true);
    expect(editing.safeParse({ ...values, linea: "" }).success).toBe(true);
    expect(editing.safeParse({ ...values, linea: "OTRA" }).success).toBe(false);

    expect(ProductCategoryFormSchema.safeParse({ ...values, linea: "DEPORTIVO" }).success).toBe(false);
    expect(createProductCategoryFormSchema("EPP").safeParse({ ...values, linea: "DEPORTIVO" }).success).toBe(false);
  });
});

const product = (id: number, categoria_producto: number | null): Product =>
  ({
    id,
    empresa: 1,
    categoria_producto,
    nombre: `P${id}`,
    codigo: null,
    cod_proscai: "",
    precio_base: "1.00",
    activo: true,
  }) as unknown as Product;

const CATEGORIES = [
  { id: 10, nombre: "Camisa", linea: "INDUSTRIAL" },
  { id: 20, nombre: "TELAS", linea: "" },
];

test.describe("buildProductRows", () => {
  test("resuelve nombre y línea de la categoría; null en ambos si no está en el catálogo", () => {
    const rows = buildProductRows([product(1, 10), product(2, 20), product(3, 99), product(4, null)], CATEGORIES);
    expect(rows.map((row) => [row.categoria_nombre, row.categoria_linea])).toEqual([
      ["Camisa", "INDUSTRIAL"],
      ["TELAS", ""],
      [null, null],
      [null, null],
    ]);
    expect(rows[0]).toMatchObject({ id: 1, nombre: "P1", categoria_producto: 10 });
  });
});

test.describe("filtros de encabezado de línea", () => {
  test("categorías: sin línea fijada primero y filtra solo las de línea vacía", () => {
    type Row = { id: number; linea: string };
    const rows: Row[] = [
      { id: 1, linea: "EPP" },
      { id: 2, linea: "" },
    ];
    const columns = withHeaderFilters<Row>(
      [{ id: "linea", header: "Línea", accessorFn: (row) => row.linea }],
      rows,
      { linea: categoriaLineaHeaderFilter<Row>((row) => row.linea) },
    );
    const h = harness(columns, rows);
    expect(h.options("linea").slice(0, 3)).toEqual([
      ALL_FILTER_OPTION,
      { value: EMPTY_VALUE_FILTER_VALUE, label: SIN_LINEA_LABEL },
      { value: "INDUSTRIAL", label: "Industrial", dotClassName: undefined },
    ]);
    expect(h.matching("linea", EMPTY_VALUE_FILTER_VALUE).map((row) => row.id)).toEqual([2]);
    expect(h.matching("linea", "EPP").map((row) => row.id)).toEqual([1]);
  });

  test("productos: \"Sin categoría o inactiva\" va aparte de \"Sin línea (materia prima)\"", () => {
    const rows = buildProductRows([product(1, 10), product(2, 20), product(3, 99), product(4, null)], CATEGORIES);
    const columns = withHeaderFilters<ProductRow>(
      getColumns(() => {}, { canEdit: false, canDelete: false }),
      rows,
      { categoria_linea: productLineaHeaderFilter },
    );
    const h = harness(columns, rows);
    const options = h.options("categoria_linea");
    const sinCategoria = options.at(-1);
    expect(sinCategoria?.label).toBe(SIN_CATEGORIA_O_INACTIVA_LABEL);
    expect(h.matching("categoria_linea", EMPTY_VALUE_FILTER_VALUE).map((row) => row.id)).toEqual([2]);
    expect(h.matching("categoria_linea", sinCategoria!.value!).map((row) => row.id)).toEqual([3, 4]);
    expect(h.matching("categoria_linea", "INDUSTRIAL").map((row) => row.id)).toEqual([1]);
  });

  test("productos: sin filas sin categoría no aparece esa opción", () => {
    const rows = buildProductRows([product(1, 10), product(2, 20)], CATEGORIES);
    const columns = withHeaderFilters<ProductRow>(
      getColumns(() => {}, { canEdit: false, canDelete: false }),
      rows,
      { categoria_linea: productLineaHeaderFilter },
    );
    const labels = harness(columns, rows).options("categoria_linea").map((option) => option.label);
    expect(labels).not.toContain(SIN_CATEGORIA_O_INACTIVA_LABEL);
  });
});
