import { faker } from "@faker-js/faker";
import type {
  MockCxC,
  MockCobro,
  MockCliente,
  CxCEstatus,
  CxCKpis,
  AgingBucket,
} from "../interfaces/accounts-receivable.interface";

// Semilla fija para datos deterministas. Es indispensable aquí porque la
// vista consume estos datos tanto desde un Server Component (Stats) como
// desde un Client Component (List); sin semilla, el servidor y el cliente
// generarían conjuntos distintos y provocarían desajustes de hidratación.
faker.seed(629426);

// Fecha de referencia "hoy" para los cálculos de vencimiento y antigüedad.
const HOY = new Date("2026-06-29");
const DIA_MS = 86_400_000;

// ── Catálogos ────────────────────────────────────────────────────────────────

const CLIENTES: MockCliente[] = [
  { id_cliente: 1,  nombre: "Constructora Norteña S.A. de C.V.",      rfc: "CNO950301AB1", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 2,  nombre: "Hospital Regional del Norte S.A.",       rfc: "HRN880715CD3", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 3,  nombre: "Plásticos del Pacífico S.A. de C.V.",    rfc: "PPA920422EF5", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 4,  nombre: "Transportes Federales SAPI de C.V.",     rfc: "TFE870630GH7", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 5,  nombre: "Grupo Textil Monterrey S.A.",            rfc: "GTM010905IJ9", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 6,  nombre: "Laboratorios Biosalud S.A. de C.V.",     rfc: "LBI001210KL2", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 7,  nombre: "Minería Norteña S.A. de C.V.",           rfc: "MNO910215MN4", regimen_fiscal: "603 - Personas Morales con Fines no Lucrativos" },
  { id_cliente: 8,  nombre: "Colegio Americano del Norte A.C.",       rfc: "CAN040820OP6", regimen_fiscal: "603 - Personas Morales con Fines no Lucrativos" },
  { id_cliente: 9,  nombre: "Industrias Mecánicas del Centro S.A.",   rfc: "IMC930118QR8", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 10, nombre: "Servicios Logísticos Express S.A.",      rfc: "SLE990727ST0", regimen_fiscal: "601 - General de Ley Personas Morales" },
  { id_cliente: 11, nombre: "Comercializadora del Bajío S. de R.L.",  rfc: "CBA051103UV2", regimen_fiscal: "612 - Personas Físicas con Actividades Empresariales" },
  { id_cliente: 12, nombre: "Distribuidora Alfa del Golfo S.A.",      rfc: "DAG960509WX4", regimen_fiscal: "601 - General de Ley Personas Morales" },
];

const METODOS_PAGO = ["Transferencia", "Cheque", "Efectivo", "Tarjeta"];

// Distribución ponderada de estatus (más vigentes que pagadas/vencidas).
const ESTATUS_POOL: CxCEstatus[] = [
  "vigente", "vigente", "vigente", "parcial", "vencida", "vencida", "pagada",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

// ── Generadores ──────────────────────────────────────────────────────────────

function generarCxC(index: number): MockCxC {
  const cliente = faker.helpers.arrayElement(CLIENTES);
  const estatus = faker.helpers.arrayElement(ESTATUS_POOL);
  const plazoDias = faker.helpers.arrayElement([30, 60, 90]);

  let fecha_vencimiento: Date;
  let dias_vencido = 0;

  if (estatus === "vencida") {
    // Las vencidas siempre tienen una fecha de vencimiento en el pasado,
    // así pueblan de forma coherente los rangos de antigüedad.
    dias_vencido = faker.number.int({ min: 1, max: 120 });
    fecha_vencimiento = new Date(HOY.getTime() - dias_vencido * DIA_MS);
  } else {
    // Vigentes / parciales / pagadas vencen próximamente.
    const porVencer = faker.number.int({ min: 2, max: 45 });
    fecha_vencimiento = new Date(HOY.getTime() + porVencer * DIA_MS);
  }

  const fecha_emision = new Date(fecha_vencimiento.getTime() - plazoDias * DIA_MS);
  const monto = faker.number.float({ min: 5000, max: 250000, fractionDigits: 2 });

  const saldo_pendiente =
    estatus === "pagada"
      ? 0
      : estatus === "parcial"
        ? round2(monto * faker.number.float({ min: 0.1, max: 0.9, fractionDigits: 2 }))
        : monto;

  return {
    id_cxc: index + 1,
    folio: `CXC-2026-${String(index + 1).padStart(5, "0")}`,
    id_cliente: cliente.id_cliente,
    cliente_nombre: cliente.nombre,
    id_factura: faker.number.int({ min: 1, max: 100 }),
    factura_folio: `FAC-2026-${String(faker.number.int({ min: 1, max: 999 })).padStart(5, "0")}`,
    fecha_emision,
    fecha_vencimiento,
    monto,
    saldo_pendiente,
    estatus,
    dias_vencido,
  };
}

function generarCobro(index: number): MockCobro {
  const cliente = faker.helpers.arrayElement(CLIENTES);
  const fecha_cobro = faker.date.between({ from: new Date("2026-05-01"), to: HOY });

  return {
    id_cobro: index + 1,
    folio: `COB-2026-${String(index + 1).padStart(5, "0")}`,
    id_cliente: cliente.id_cliente,
    cliente_nombre: cliente.nombre,
    fecha_cobro,
    monto: faker.number.float({ min: 5000, max: 200000, fractionDigits: 2 }),
    metodo_pago: faker.helpers.arrayElement(METODOS_PAGO),
    cxc_folio: `CXC-2026-${String(faker.number.int({ min: 1, max: 40 })).padStart(5, "0")}`,
  };
}

// ── Datos generados ──────────────────────────────────────────────────────────

/** 40 cuentas por cobrar generadas con Faker.js (seed 629426). */
export const MOCK_CXC: MockCxC[] = Array.from({ length: 40 }, (_, i) => generarCxC(i));

/** 15 cobros recientes generados con Faker.js. */
export const MOCK_COBROS: MockCobro[] = Array.from({ length: 15 }, (_, i) => generarCobro(i));

// ── KPIs derivados ───────────────────────────────────────────────────────────

const esMismoMes = (d: Date) =>
  d.getMonth() === HOY.getMonth() && d.getFullYear() === HOY.getFullYear();

export const CXC_KPIS: CxCKpis = {
  totalPorCobrar: round2(
    sum(MOCK_CXC.filter((c) => c.estatus !== "pagada").map((c) => c.saldo_pendiente)),
  ),
  totalVencido: round2(
    sum(MOCK_CXC.filter((c) => c.estatus === "vencida").map((c) => c.saldo_pendiente)),
  ),
  // Saldo abierto (vigente o parcial) cuyo vencimiento cae en los próximos 30 días.
  porVencer30: round2(
    sum(
      MOCK_CXC.filter(
        (c) =>
          (c.estatus === "vigente" || c.estatus === "parcial") &&
          c.fecha_vencimiento.getTime() <= HOY.getTime() + 30 * DIA_MS,
      ).map((c) => c.saldo_pendiente),
    ),
  ),
  cobradoEsteMes: round2(
    sum(MOCK_COBROS.filter((c) => esMismoMes(c.fecha_cobro)).map((c) => c.monto)),
  ),
  cuentasVencidas: MOCK_CXC.filter((c) => c.estatus === "vencida").length,
};

// ── Antigüedad de saldos (aging) ─────────────────────────────────────────────

const AGING_DEFS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: "0-30",  label: "0–30 días",  min: 0,  max: 30 },
  { key: "31-60", label: "31–60 días", min: 31, max: 60 },
  { key: "61-90", label: "61–90 días", min: 61, max: 90 },
  { key: "90+",   label: "+90 días",   min: 91, max: Infinity },
];

export const CXC_AGING: AgingBucket[] = (() => {
  const vencidas = MOCK_CXC.filter((c) => c.estatus === "vencida");
  return AGING_DEFS.map(({ key, label, min, max }) => {
    const items = vencidas.filter((c) => c.dias_vencido >= min && c.dias_vencido <= max);
    return { key, label, count: items.length, amount: round2(sum(items.map((c) => c.saldo_pendiente))) };
  });
})();
