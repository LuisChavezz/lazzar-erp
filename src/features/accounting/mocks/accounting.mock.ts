import { faker } from "@faker-js/faker";
import type {
  MockCuentaContable,
  MockCentroCosto,
  MockPoliza,
  CuentaTipo,
  PolizaTipo,
  PolizaEstatus,
  PolizaOrigen,
  AccountingKpis,
  BalanceGroup,
} from "../interfaces/accounting-entry.interface";

// Semilla fija para datos deterministas (igual que CxC / CxP): la vista consume
// estos datos desde un Server Component (Stats) y un Client Component (List);
// sin semilla, servidor y cliente generarían conjuntos distintos y habría
// desajustes de hidratación.
faker.seed(730219);

// Fecha de referencia "hoy" para los cálculos del periodo.
const HOY = new Date("2026-06-29");

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

// ── Catálogo de cuentas contables (plan de cuentas) ──────────────────────────

const CUENTAS_CATALOGO: Array<{
  codigo: string;
  nombre: string;
  tipo: CuentaTipo;
  naturaleza: MockCuentaContable["naturaleza"];
}> = [
  { codigo: "1.1.01", nombre: "Caja", tipo: "activo", naturaleza: "deudora" },
  { codigo: "1.1.02", nombre: "Bancos", tipo: "activo", naturaleza: "deudora" },
  { codigo: "1.1.03", nombre: "Clientes", tipo: "activo", naturaleza: "deudora" },
  { codigo: "1.1.04", nombre: "Inventarios", tipo: "activo", naturaleza: "deudora" },
  { codigo: "1.2.01", nombre: "Maquinaria y Equipo", tipo: "activo", naturaleza: "deudora" },
  { codigo: "1.2.02", nombre: "Dep. Acum. Maq. y Equipo", tipo: "activo", naturaleza: "acreedora" },
  { codigo: "2.1.01", nombre: "Proveedores", tipo: "pasivo", naturaleza: "acreedora" },
  { codigo: "2.1.02", nombre: "Acreedores Diversos", tipo: "pasivo", naturaleza: "acreedora" },
  { codigo: "2.1.03", nombre: "IVA por Pagar", tipo: "pasivo", naturaleza: "acreedora" },
  { codigo: "2.2.01", nombre: "Préstamos Bancarios L/P", tipo: "pasivo", naturaleza: "acreedora" },
  { codigo: "3.1.01", nombre: "Capital Social", tipo: "capital", naturaleza: "acreedora" },
  { codigo: "3.2.01", nombre: "Utilidad del Ejercicio", tipo: "capital", naturaleza: "acreedora" },
  { codigo: "4.1.01", nombre: "Ventas", tipo: "ingreso", naturaleza: "acreedora" },
  { codigo: "4.1.02", nombre: "Devoluciones sobre Ventas", tipo: "ingreso", naturaleza: "deudora" },
  { codigo: "5.1.01", nombre: "Costo de Ventas", tipo: "costo", naturaleza: "deudora" },
  { codigo: "6.1.01", nombre: "Gastos de Administración", tipo: "egreso", naturaleza: "deudora" },
  { codigo: "6.1.02", nombre: "Gastos de Venta", tipo: "egreso", naturaleza: "deudora" },
  { codigo: "6.2.01", nombre: "Gastos Financieros", tipo: "egreso", naturaleza: "deudora" },
];

export const MOCK_CUENTAS_CONTABLES: MockCuentaContable[] = CUENTAS_CATALOGO.map((c, i) => ({
  id_cuenta_contable: i + 1,
  ...c,
  nivel: c.codigo.split(".").length,
  saldo: faker.number.float({ min: -500000, max: 2000000, fractionDigits: 2 }),
  activa: faker.helpers.arrayElement([true, true, true, true, false]),
}));

// ── Centros de costo ─────────────────────────────────────────────────────────

const CENTROS_CATALOGO = [
  { nombre: "Producción", area: "Manufactura" },
  { nombre: "Corte y Confección", area: "Manufactura" },
  { nombre: "Bordado y Serigrafía", area: "Manufactura" },
  { nombre: "Ventas", area: "Comercial" },
  { nombre: "Administración General", area: "Administración" },
  { nombre: "Logística y Distribución", area: "Operaciones" },
];

export const MOCK_CENTROS_COSTO: MockCentroCosto[] = CENTROS_CATALOGO.map((c, i) => {
  const presupuesto = faker.number.float({ min: 100000, max: 1500000, fractionDigits: 2 });
  return {
    id_centro_costo: i + 1,
    codigo: `CC-${String(i + 1).padStart(3, "0")}`,
    nombre: c.nombre,
    area: c.area,
    presupuesto,
    gasto_real: round2(presupuesto * faker.number.float({ min: 0.5, max: 1.2, fractionDigits: 2 })),
  };
});

// ── Pólizas ──────────────────────────────────────────────────────────────────

const CONCEPTOS_POR_TIPO: Record<PolizaTipo, string[]> = {
  ingreso: [
    "Cobro a cliente por factura",
    "Depósito en cuenta bancaria",
    "Anticipo de cliente",
    "Devolución de IVA SAT",
  ],
  egreso: [
    "Pago a proveedor",
    "Pago de nómina",
    "Pago de servicios",
    "Compra de materiales",
    "Pago de impuestos",
  ],
  diario: [
    "Registro de depreciación",
    "Ajuste de inventario",
    "Provisión de gastos",
    "Reclasificación contable",
  ],
  cierre: ["Cierre mensual", "Traspaso a resultados", "Cierre de ejercicio"],
};

const USUARIOS = [
  "Ana Ramírez",
  "Carlos Mendoza",
  "Lucía Torres",
  "Humberto Vega",
  "Patricia Salinas",
  "Roberto Sánchez",
];

const TIPO_POOL: PolizaTipo[] = ["ingreso", "ingreso", "egreso", "egreso", "diario", "cierre"];
const ESTATUS_POOL: PolizaEstatus[] = [
  "contabilizada",
  "contabilizada",
  "contabilizada",
  "borrador",
  "cancelada",
];
const ORIGEN_POOL: PolizaOrigen[] = [
  "factura",
  "factura_proveedor",
  "pago",
  "cobro",
  "manual",
  "nomina",
  "banco",
];

export const MOCK_POLIZAS: MockPoliza[] = Array.from({ length: 50 }, (_, i) => {
  const tipo = faker.helpers.arrayElement(TIPO_POOL);
  const monto = faker.number.float({ min: 5000, max: 300000, fractionDigits: 2 });
  return {
    id_poliza: i + 1,
    folio: `POL-2026-${String(i + 1).padStart(5, "0")}`,
    tipo,
    fecha: faker.date.between({ from: new Date("2026-01-01"), to: HOY }),
    concepto: faker.helpers.arrayElement(CONCEPTOS_POR_TIPO[tipo]),
    total_cargos: monto,
    total_abonos: monto,
    estatus: faker.helpers.arrayElement(ESTATUS_POOL),
    origen: faker.helpers.arrayElement(ORIGEN_POOL),
    usuario_nombre: faker.helpers.arrayElement(USUARIOS),
  };
});

// ── KPIs derivados ───────────────────────────────────────────────────────────

const esMismoMes = (d: Date) =>
  d.getMonth() === HOY.getMonth() && d.getFullYear() === HOY.getFullYear();

export const ACCOUNTING_KPIS: AccountingKpis = {
  totalPolizas: MOCK_POLIZAS.length,
  polizasDelMes: MOCK_POLIZAS.filter((p) => esMismoMes(p.fecha)).length,
  polizasContabilizadas: MOCK_POLIZAS.filter((p) => p.estatus === "contabilizada").length,
  polizasBorrador: MOCK_POLIZAS.filter((p) => p.estatus === "borrador").length,
  totalCargosDelMes: round2(
    sum(MOCK_POLIZAS.filter((p) => esMismoMes(p.fecha)).map((p) => p.total_cargos)),
  ),
  centrosSobrePresupuesto: MOCK_CENTROS_COSTO.filter((c) => c.gasto_real > c.presupuesto).length,
};

// ── Balance por tipo de cuenta (resumen del plan de cuentas) ─────────────────

const TIPO_LABEL: Record<CuentaTipo, string> = {
  activo: "Activo",
  pasivo: "Pasivo",
  capital: "Capital",
  ingreso: "Ingresos",
  costo: "Costos",
  egreso: "Egresos",
};

const TIPO_ORDER: CuentaTipo[] = ["activo", "pasivo", "capital", "ingreso", "costo", "egreso"];

export const BALANCE_BY_TYPE: BalanceGroup[] = TIPO_ORDER.map((tipo) => {
  const cuentas = MOCK_CUENTAS_CONTABLES.filter((c) => c.tipo === tipo);
  return {
    tipo,
    label: TIPO_LABEL[tipo],
    total: round2(sum(cuentas.map((c) => c.saldo))),
    count: cuentas.length,
  };
});
