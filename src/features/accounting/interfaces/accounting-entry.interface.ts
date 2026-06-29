// Modelo de dominio (maqueta) para Contabilidad General (libro mayor):
// pólizas, plan de cuentas y centros de costo. Montos numéricos y fechas como
// objetos Date, en línea con los módulos de Cuentas por Cobrar / por Pagar.

export type CuentaTipo =
  | "activo"
  | "pasivo"
  | "capital"
  | "ingreso"
  | "egreso"
  | "costo";

export type CuentaNaturaleza = "deudora" | "acreedora";

export interface MockCuentaContable {
  id_cuenta_contable: number;
  codigo: string; // p. ej. "1.1.01", "2.3.02"
  nombre: string;
  tipo: CuentaTipo;
  naturaleza: CuentaNaturaleza;
  nivel: number; // 1 = mayor, 2 = subcuenta, 3 = auxiliar
  saldo: number;
  activa: boolean;
}

export interface MockCentroCosto {
  id_centro_costo: number;
  codigo: string; // p. ej. "CC-001"
  nombre: string;
  area: string;
  presupuesto: number;
  gasto_real: number;
}

export type PolizaTipo = "ingreso" | "egreso" | "diario" | "cierre";
export type PolizaEstatus = "borrador" | "contabilizada" | "cancelada";
export type PolizaOrigen =
  | "manual"
  | "factura"
  | "factura_proveedor"
  | "pago"
  | "cobro"
  | "nomina"
  | "banco";

export interface MockPoliza {
  id_poliza: number;
  folio: string; // p. ej. "POL-2026-00001"
  tipo: PolizaTipo;
  fecha: Date;
  concepto: string;
  total_cargos: number;
  total_abonos: number;
  estatus: PolizaEstatus;
  origen: PolizaOrigen;
  usuario_nombre: string;
}

export interface MockPolizaDetalle {
  id_poliza_detalle: number;
  id_poliza: number;
  poliza_folio: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  centro_costo_nombre: string | null;
  concepto: string;
  cargo: number;
  abono: number;
  referencia: string | null; // factura folio, pago folio, etc.
}

export interface AccountingKpis {
  totalPolizas: number;
  polizasDelMes: number;
  polizasContabilizadas: number;
  polizasBorrador: number;
  totalCargosDelMes: number;
  centrosSobrePresupuesto: number;
}

export interface BalanceGroup {
  tipo: CuentaTipo;
  label: string;
  total: number;
  count: number;
}
