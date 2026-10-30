import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { harness } from "./support/headerFilterHarness";
import {
  BANK_HEADER_FILTERS,
  getColumns as getBankColumns,
} from "@/src/features/banks/components/BankColumns";
import {
  BANK_ACCOUNT_HEADER_FILTERS,
  getColumns as getBankAccountColumns,
} from "@/src/features/bank-accounts/components/BankAccountColumns";
import {
  CHART_OF_ACCOUNT_HEADER_FILTERS,
  getColumns as getChartOfAccountColumns,
} from "@/src/features/chart-of-accounts/components/ChartOfAccountColumns";
import {
  COST_CENTER_HEADER_FILTERS,
  getColumns as getCostCenterColumns,
} from "@/src/features/cost-centers/components/CostCenterColumns";
import {
  ACCOUNTING_CUSTOMER_HEADER_FILTERS,
  accountingCustomerColumns,
} from "@/src/features/accounting-customers/components/AccountingCustomerColumns";
import type { Banco } from "@/src/features/banks/interfaces/bank.interface";
import type { CuentaBancaria } from "@/src/features/bank-accounts/interfaces/bank-account.interface";
import type { CuentaContable } from "@/src/features/chart-of-accounts/interfaces/chart-of-account.interface";
import type { CostCenter } from "@/src/features/cost-centers/interfaces/cost-center.interface";
import type { AccountingCustomer } from "@/src/features/accounting-customers/interfaces/accounting-customer.interface";

/**
 * Pruebas unitarias de EC-674 sobre los catálogos de Finanzas (bancos, cuentas
 * bancarias, plan de cuentas, centros de costo, clientes de contabilidad): las
 * opciones y fichas de cada filtro de encabezado. Se leen el `filterFn`, el
 * accessor y las props del `FilterHeader`, sin renderizar nada.
 */

const labels = (options: { label: string }[]) => options.map((o) => o.label);

test.describe("activo como «Estatus» en los cinco catálogos", () => {
  const cases: [string, ColumnDef<never, unknown>[], string][] = [
    ["bancos", withHeaderFilters(getBankColumns() as ColumnDef<Banco, unknown>[], [], BANK_HEADER_FILTERS) as never, "nombre"],
    [
      "cuentas bancarias",
      withHeaderFilters(getBankAccountColumns() as ColumnDef<CuentaBancaria, unknown>[], [], BANK_ACCOUNT_HEADER_FILTERS) as never,
      "alias",
    ],
    [
      "plan de cuentas",
      withHeaderFilters(getChartOfAccountColumns() as ColumnDef<CuentaContable, unknown>[], [], CHART_OF_ACCOUNT_HEADER_FILTERS) as never,
      "nombre",
    ],
    [
      "centros de costo",
      withHeaderFilters(getCostCenterColumns() as ColumnDef<CostCenter, unknown>[], [], COST_CENTER_HEADER_FILTERS) as never,
      "nombre",
    ],
    [
      "clientes de contabilidad",
      withHeaderFilters(accountingCustomerColumns as ColumnDef<AccountingCustomer, unknown>[], [], ACCOUNTING_CUSTOMER_HEADER_FILTERS) as never,
      "nombre",
    ],
  ];

  for (const [name, columns, id] of cases) {
    test(`${name}: la columna del nombre filtra Activo/Inactivo con ficha "Estatus"`, () => {
      const t = harness(columns, []);
      expect(labels(t.options(id))).toEqual(["Todos", "Activo", "Inactivo"]);
      expect(t.column(id).meta?.filterLabel).toBe("Estatus");
    });
  }
});

test.describe("cuentas bancarias: filtro de banco", () => {
  const rows = [
    { id: 1, banco: 3, banco_nombre: "BBVA", alias: "OPERACIÓN", activo: true },
    { id: 2, banco: 9, banco_nombre: null, alias: "NÓMINA", activo: false },
    { id: 3, banco: 3, banco_nombre: "BBVA", alias: "AHORRO", activo: true },
  ] as CuentaBancaria[];
  const t = harness<CuentaBancaria>(
    withHeaderFilters(getBankAccountColumns() as ColumnDef<CuentaBancaria, unknown>[], rows, BANK_ACCOUNT_HEADER_FILTERS),
    rows,
  );

  test("las opciones salen de las filas, una por banco, y comparan contra el id", () => {
    expect(t.options("banco").map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["9", "Banco #9"],
      ["3", "BBVA"],
    ]);
    expect(t.matching("banco", "3").map((r) => r.id)).toEqual([1, 3]);
  });

  test("un banco sin nombre se rotula `Banco #N` igual en la celda y en la opción", () => {
    expect(t.cellText("banco", rows[1])).toBe("Banco #9");
  });
});

test.describe("plan de cuentas: tipo y movimientos", () => {
  const rows = [
    { id: 1, codigo: "1100", nombre: "BANCOS", tipo: "Activo", nivel: 2, acepta_movimientos: true, activo: true },
    { id: 2, codigo: "4000", nombre: "VENTAS", tipo: "Ingreso", nivel: 1, acepta_movimientos: false, activo: true },
    { id: 3, codigo: "9000", nombre: "ORDEN", tipo: "Orden", nivel: 1, acepta_movimientos: true, activo: false },
  ] as unknown as CuentaContable[];
  const t = harness<CuentaContable>(
    withHeaderFilters(getChartOfAccountColumns() as ColumnDef<CuentaContable, unknown>[], rows, CHART_OF_ACCOUNT_HEADER_FILTERS),
    rows,
  );

  test("el tipo ofrece el enum completo en su orden y al final el valor desconocido, crudo", () => {
    expect(labels(t.options("tipo"))).toEqual([
      "Todos",
      "Activo",
      "Pasivo",
      "Capital",
      "Ingreso",
      "Gasto",
      "Costo",
      "Orden",
    ]);
    expect(t.matching("tipo", "Ingreso").map((r) => r.id)).toEqual([2]);
  });

  test("movimientos filtra Acepta/Agrupación", () => {
    expect(labels(t.options("acepta_movimientos"))).toEqual(["Todos", "Acepta", "Agrupación"]);
    expect(t.matching("acepta_movimientos", "no").map((r) => r.id)).toEqual([2]);
  });
});
