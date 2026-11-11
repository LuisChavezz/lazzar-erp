import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import {
  customersTable,
  findCustomerInListPages,
  formatUltimaCompra,
  SIN_COMPRAS_LABEL,
} from "@/src/features/customers/utils/customerList";
import type { CustomerListItem } from "@/src/features/customers/interfaces/customer.interface";
import { getCustomerColumnText } from "@/src/features/customers/utils/customerExport";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";

/**
 * EC-754: listado de clientes de Ventas en modo servidor contra
 * `GET /terceros/clientes/` (búsqueda y orden en el backend, EC-757/EC-853).
 */

const criteriaOf = (query: string) => {
  const params = new URLSearchParams(query);
  return toServerTableCriteria(
    customersTable,
    readServerTableState(customersTable, (key) => params.get(key)),
  );
};

test.describe("parámetros del listado de clientes", () => {
  test("sin nada elegido manda el orden por defecto del backend con desempate", () => {
    expect(criteriaOf("")).toEqual({ ordering: "nombre,-id" });
  });

  test("la búsqueda viaja como `search`", () => {
    expect(criteriaOf("search=81%201234")).toEqual({ search: "81 1234", ordering: "nombre,-id" });
  });

  test("cada columna ordenable llega con `-id` de desempate", () => {
    for (const field of ["razon_social", "telefono", "correo", "fecha_ultima_compra"]) {
      expect(criteriaOf(`ordering=${field}`)).toEqual({ ordering: `${field},-id` });
      expect(criteriaOf(`ordering=-${field}`)).toEqual({ ordering: `-${field},-id` });
    }
  });

  test("un orden fuera de la lista blanca o un filtro no llegan al backend", () => {
    expect(criteriaOf("ordering=rfc&activo=false")).toEqual({ ordering: "nombre,-id" });
  });
});

test.describe("formatUltimaCompra", () => {
  test("null es un cliente sin compras", () => {
    expect(formatUltimaCompra(null)).toBe(SIN_COMPRAS_LABEL);
  });

  test("una fecha se lee como día de calendario (sin correr al día anterior)", () => {
    expect(formatUltimaCompra("2026-07-14")).toBe(formatShortCalendarDate("2026-07-14"));
    expect(formatUltimaCompra("2026-07-14")).toMatch(/^14 jul\.? 2026$/);
  });

  test("ausente o inválida es «—», no «Sin compras»", () => {
    expect(formatUltimaCompra(undefined)).toBe("—");
    expect(formatUltimaCompra("2026-02-30")).toBe("—");
  });
});

test.describe("findCustomerInListPages", () => {
  const row = (id: number) => ({ id, razon_social: `Cliente ${id}` }) as unknown as CustomerListItem;

  test("encuentra la fila en cualquier página cacheada de la tabla", () => {
    const client = new QueryClient();
    client.setQueryData(["customers", "list", { limit: 20, offset: 0 }], {
      count: 2,
      next: null,
      previous: null,
      results: [row(1)],
    });
    client.setQueryData(["customers", "list", { limit: 20, offset: 20, search: "x" }], {
      count: 2,
      next: null,
      previous: null,
      results: [row(7)],
    });
    expect(findCustomerInListPages(client, "7")?.razon_social).toBe("Cliente 7");
    expect(findCustomerInListPages(client, "9")).toBeUndefined();
  });

  test("ignora el catálogo completo y las entradas que no son páginas", () => {
    const client = new QueryClient();
    client.setQueryData(["customers"], [row(3)]);
    client.setQueryData(["customers", "list", { limit: 20, offset: 40 }], { serverTablePageGone: true });
    expect(findCustomerInListPages(client, "3")).toBeUndefined();
  });
});

test.describe("getCustomerColumnText (exportaciones)", () => {
  const column = (id: string) => ({ id, header: id }) as DataTableVisibleColumn<CustomerListItem>;
  const customer = {
    id: 5,
    razon_social: "ACME SA",
    telefono: null,
    fecha_ultima_compra: null,
  } as unknown as CustomerListItem;

  test("Última Compra sale con el mismo texto que la celda", () => {
    expect(getCustomerColumnText(customer, column("ultima_compra"))).toBe(SIN_COMPRAS_LABEL);
    expect(
      getCustomerColumnText({ ...customer, fecha_ultima_compra: "2026-07-14" }, column("ultima_compra")),
    ).toBe(formatUltimaCompra("2026-07-14"));
  });

  test("las demás columnas leen el campo de su id; vacío es cadena vacía", () => {
    expect(getCustomerColumnText(customer, column("razon_social"))).toBe("ACME SA");
    expect(getCustomerColumnText(customer, column("telefono"))).toBe("");
  });
});
