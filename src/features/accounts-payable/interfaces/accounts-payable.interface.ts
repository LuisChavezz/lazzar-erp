// Modelo de dominio (maqueta) para Cuentas por Pagar (CxP) a proveedores.
// Espejo del modelo de Cuentas por Cobrar: montos numéricos y fechas como
// objetos Date para permitir formateo y cálculos (vencimientos, antigüedad).

export interface MockProveedor {
  id_proveedor: number;
  nombre: string;
  rfc: string;
}

export interface MockFacturaProveedor {
  id_factura_proveedor: number;
  folio: string;
  fecha_emision: Date;
  subtotal: number;
  iva: number;
  total: number;
  id_proveedor: number;
  moneda: "MXN" | "USD";
  id_oc: number;
}

export type CxPEstatus = "vigente" | "vencida" | "pagada" | "parcial";

export interface MockCxP {
  id_cxp: number;
  folio: string;
  id_proveedor: number;
  proveedor_nombre: string;
  id_factura_proveedor: number;
  factura_folio: string;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  monto: number;
  saldo_pendiente: number;
  estatus: CxPEstatus;
  dias_vencido: number;
  oc_folio: string;
}

export interface MockPago {
  id_pago: number;
  folio: string;
  id_proveedor: number;
  proveedor_nombre: string;
  fecha_pago: Date;
  monto: number;
  metodo_pago: string;
  cxp_folio: string;
  cuenta_bancaria: string;
}

export interface CxPKpis {
  totalPorPagar: number;
  totalVencido: number;
  porVencer30: number;
  pagadoEsteMes: number;
  cuentasVencidas: number;
}

export interface AgingBucket {
  key: string;
  label: string;
  count: number;
  amount: number;
}
