import { faker } from "@faker-js/faker";
import type {
  MockCxP,
  MockPago,
  MockProveedor,
  CxPEstatus,
  CxPKpis,
  AgingBucket,
} from "../interfaces/accounts-payable.interface";

// Semilla fija para datos deterministas. Igual que en Cuentas por Cobrar:
// la vista consume estos datos desde un Server Component (Stats) y desde un
// Client Component (List); sin semilla, servidor y cliente generarían
// conjuntos distintos y habría desajustes de hidratación.
faker.seed(514287);

// Fecha de referencia "hoy" para los cálculos de vencimiento y antigüedad.
const HOY = new Date("2026-06-29");
const DIA_MS = 86_400_000;

// ── Catálogos ──────────────────────────────────────────────────────────────────

const PROVEEDORES: MockProveedor[] = [
  { id_proveedor: 1,  nombre: "Textiles Industriales del Norte S.A.",      rfc: "TIN950301AB1" },
  { id_proveedor: 2,  nombre: "Fibras y Tejidos del Bajío S.A.",           rfc: "FTB880715CD3" },
  { id_proveedor: 3,  nombre: "Hilos y Accesorios Monterrey S.A.",         rfc: "HAM920422EF5" },
  { id_proveedor: 4,  nombre: "Cremalleras y Botones del Pacífico S.A.",   rfc: "CBP870630GH7" },
  { id_proveedor: 5,  nombre: "Telas Finas del Noreste S.A. de C.V.",      rfc: "TFN010905IJ9" },
  { id_proveedor: 6,  nombre: "Etiquetas y Bordados Express S.C.",         rfc: "EBE001210KL2" },
  { id_proveedor: 7,  nombre: "Materiales de Empaque Industrial S.A.",     rfc: "MEI910215MN4" },
  { id_proveedor: 8,  nombre: "Tintorería Industrial del Norte S.A.",      rfc: "TIN040820OP6" },
  { id_proveedor: 9,  nombre: "Suministros Textiles del Centro S.A.",      rfc: "STC930118QR8" },
  { id_proveedor: 10, nombre: "Maquinaria y Refacciones del Bajío S.A.",   rfc: "MRB990727ST0" },
  { id_proveedor: 11, nombre: "Servicios Logísticos del Golfo S. de R.L.", rfc: "SLG051103UV2" },
  { id_proveedor: 12, nombre: "Insumos Corporativos Alfa S.A. de C.V.",    rfc: "ICA960509WX4" },
];

const METODOS_PAGO = ["Transferencia SPEI", "Cheque", "Efectivo", "Tarjeta empresarial"];

const BANCOS = ["BBVA", "Banorte", "Santander", "Banamex", "HSBC"];

// Distribución ponderada de estatus (más vigentes que pagadas/vencidas).
const ESTATUS_POOL: CxPEstatus[] = [
  "vigente", "vigente", "vigente", "parcial", "vencida", "vencida", "pagada",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

// ── Generadores ──────────────────────────────────────────────────────────────

function generarCxP(index: number): MockCxP {
  const proveedor = faker.helpers.arrayElement(PROVEEDORES);
  const estatus = faker.helpers.arrayElement(ESTATUS_POOL);
  // Los plazos de pago a proveedores suelen ser más cortos que los de cobro.
  const plazoDias = faker.helpers.arrayElement([15, 30, 45, 60]);

  let fecha_vencimiento: Date;
  let dias_vencido = 0;

  if (estatus === "vencida") {
    // Las vencidas siempre tienen vencimiento en el pasado para poblar de
    // forma coherente los rangos de antigüedad (incluido el crítico +60).
    dias_vencido = faker.number.int({ min: 1, max: 90 });
    fecha_vencimiento = new Date(HOY.getTime() - dias_vencido * DIA_MS);
  } else {
    const porVencer = faker.number.int({ min: 2, max: 45 });
    fecha_vencimiento = new Date(HOY.getTime() + porVencer * DIA_MS);
  }

  const fecha_emision = new Date(fecha_vencimiento.getTime() - plazoDias * DIA_MS);
  const monto = faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 });

  const saldo_pendiente =
    estatus === "pagada"
      ? 0
      : estatus === "parcial"
        ? round2(monto * faker.number.float({ min: 0.1, max: 0.9, fractionDigits: 2 }))
        : monto;

  return {
    id_cxp: index + 1,
    folio: `CXP-2026-${String(index + 1).padStart(5, "0")}`,
    id_proveedor: proveedor.id_proveedor,
    proveedor_nombre: proveedor.nombre,
    id_factura_proveedor: faker.number.int({ min: 1, max: 100 }),
    factura_folio: `FPROV-2026-${String(faker.number.int({ min: 1, max: 999 })).padStart(5, "0")}`,
    fecha_emision,
    fecha_vencimiento,
    monto,
    saldo_pendiente,
    estatus,
    dias_vencido,
    oc_folio: `OC-2026-${String(faker.number.int({ min: 1, max: 500 })).padStart(5, "0")}`,
  };
}

function generarPago(index: number): MockPago {
  const proveedor = faker.helpers.arrayElement(PROVEEDORES);
  const fecha_pago = faker.date.between({ from: new Date("2026-05-01"), to: HOY });

  return {
    id_pago: index + 1,
    folio: `PAG-2026-${String(index + 1).padStart(5, "0")}`,
    id_proveedor: proveedor.id_proveedor,
    proveedor_nombre: proveedor.nombre,
    fecha_pago,
    monto: faker.number.float({ min: 10000, max: 400000, fractionDigits: 2 }),
    metodo_pago: faker.helpers.arrayElement(METODOS_PAGO),
    cxp_folio: `CXP-2026-${String(faker.number.int({ min: 1, max: 40 })).padStart(5, "0")}`,
    cuenta_bancaria: `${faker.helpers.arrayElement(BANCOS)} ****${faker.number.int({ min: 1000, max: 9999 })}`,
  };
}

// ── Datos generados ──────────────────────────────────────────────────────────

/** 40 cuentas por pagar generadas con Faker.js (seed 514287). */
export const MOCK_CXP: MockCxP[] = Array.from({ length: 40 }, (_, i) => generarCxP(i));

/** 15 pagos recientes generados con Faker.js. */
export const MOCK_PAGOS: MockPago[] = Array.from({ length: 15 }, (_, i) => generarPago(i));

// ── KPIs derivados ───────────────────────────────────────────────────────────

const esMismoMes = (d: Date) =>
  d.getMonth() === HOY.getMonth() && d.getFullYear() === HOY.getFullYear();

export const CXP_KPIS: CxPKpis = {
  totalPorPagar: round2(
    sum(MOCK_CXP.filter((c) => c.estatus !== "pagada").map((c) => c.saldo_pendiente)),
  ),
  totalVencido: round2(
    sum(MOCK_CXP.filter((c) => c.estatus === "vencida").map((c) => c.saldo_pendiente)),
  ),
  // Saldo abierto (vigente o parcial) cuyo vencimiento cae en los próximos 30 días.
  porVencer30: round2(
    sum(
      MOCK_CXP.filter(
        (c) =>
          (c.estatus === "vigente" || c.estatus === "parcial") &&
          c.fecha_vencimiento.getTime() <= HOY.getTime() + 30 * DIA_MS,
      ).map((c) => c.saldo_pendiente),
    ),
  ),
  pagadoEsteMes: round2(
    sum(MOCK_PAGOS.filter((c) => esMismoMes(c.fecha_pago)).map((c) => c.monto)),
  ),
  cuentasVencidas: MOCK_CXP.filter((c) => c.estatus === "vencida").length,
};

// ── Antigüedad de saldos (aging) ─────────────────────────────────────────────
// Rangos más estrechos que en CxC: el pago a proveedores suele tener plazos
// más cortos y el tramo +60 días es crítico para la relación comercial.

const AGING_DEFS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: "0-15",  label: "0–15 días",  min: 0,  max: 15 },
  { key: "16-30", label: "16–30 días", min: 16, max: 30 },
  { key: "31-60", label: "31–60 días", min: 31, max: 60 },
  { key: "60+",   label: "+60 días",   min: 61, max: Infinity },
];

export const CXP_AGING: AgingBucket[] = (() => {
  const vencidas = MOCK_CXP.filter((c) => c.estatus === "vencida");
  return AGING_DEFS.map(({ key, label, min, max }) => {
    const items = vencidas.filter((c) => c.dias_vencido >= min && c.dias_vencido <= max);
    return { key, label, count: items.length, amount: round2(sum(items.map((c) => c.saldo_pendiente))) };
  });
})();
