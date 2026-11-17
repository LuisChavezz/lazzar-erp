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
import type { Product } from "@/src/features/products/interfaces/product.interface";
import {
  productCategoryLabel,
  productLineaLabel,
} from "@/src/features/products/components/ProductColumns";
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

/**
 * EC-897 / EC-905: la celda de Categoría y la de Línea de las tablas de
 * productos leen lo que trae la fila (`categoria_producto_nombre` /
 * `categoria_producto_linea`), también con la categoría inactiva, y "sin
 * línea" se pinta igual que la opción `SIN_LINEA` del filtro.
 */
test.describe("celdas de categoría y línea de productos", () => {
  type CategoryFields = Pick<Product, "categoria_producto_nombre" | "categoria_producto_linea">;
  const row = (nombre: string | null, linea: CategoryFields["categoria_producto_linea"]): CategoryFields => ({
    categoria_producto_nombre: nombre,
    categoria_producto_linea: linea,
  });

  test("categoría con línea: su nombre y la etiqueta de la línea", () => {
    expect(productCategoryLabel(row("Camisa", "INDUSTRIAL"))).toBe("Camisa");
    expect(productLineaLabel(row("Camisa", "INDUSTRIAL"))).toBe("Industrial");
  });

  test("categoría inactiva: la fila trae nombre y línea igual que una activa", () => {
    // El catálogo de categorías solo lista activas; la fila no depende de él.
    expect(productCategoryLabel(row("Chamarra vieja", "ROPA_FRIO"))).toBe("Chamarra vieja");
    expect(productLineaLabel(row("Chamarra vieja", "ROPA_FRIO"))).toBe("Ropa de frío");
  });

  test("línea vacía (\"\"): sin línea, la misma etiqueta que la opción SIN_LINEA", () => {
    expect(productLineaLabel(row("TELAS", ""))).toBe(SIN_LINEA_LABEL);
    expect(productCategoryLabel(row("TELAS", ""))).toBe("TELAS");
  });

  test("sin categoría (null): sin línea y categoría \"—\"", () => {
    expect(productLineaLabel(row(null, null))).toBe(SIN_LINEA_LABEL);
    expect(productCategoryLabel(row(null, null))).toBe("—");
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
});
