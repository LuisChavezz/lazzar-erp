// Modelo de dominio (maqueta) para Cuentas por Cobrar (CxC).
// Los montos son numéricos y las fechas son objetos Date para permitir
// formateo y cálculos (vencimientos, antigüedad, KPIs) en la vista.

export interface MockCliente {
  id_cliente: number;
  nombre: string;
  rfc: string;
  regimen_fiscal: string;
}

export interface MockFactura {
  id_factura: number;
  folio: string;
  fecha_emision: Date;
  subtotal: number;
  iva: number;
  total: number;
  id_cliente: number;
  moneda: "MXN" | "USD";
}

export type CxCEstatus = "vigente" | "vencida" | "pagada" | "parcial";

export interface MockCxC {
  id_cxc: number;
  folio: string;
  id_cliente: number;
  cliente_nombre: string;
  id_factura: number;
  factura_folio: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto: number;
  saldo_pendiente: number;
  estatus: CxCEstatus;
  dias_vencido: number;
}

export interface MockCobro {
  id_cobro: number;
  folio: string;
  id_cliente: number;
  cliente_nombre: string;
  fecha_cobro: Date;
  monto: number;
  metodo_pago: string;
  cxc_folio: string;
}

export interface CxCKpis {
  totalPorCobrar: number;
  totalVencido: number;
  porVencer30: number;
  cobradoEsteMes: number;
  cuentasVencidas: number;
}

export interface AgingBucket {
  key: string;
  label: string;
  count: number;
  amount: number;
}
