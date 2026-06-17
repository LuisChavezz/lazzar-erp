export interface Receipt {
  id: number;
  folio: string;
  remision: string | null;
  factura_referencia: string | null;
  fecha_recepcion: string;
  estatus: number;
  activo: boolean;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  orden_compra: number;
  empresa: number;
  sucursal: number;
  proveedor: number;
  almacen: number;
  transportista: number | null;
  usuario: number;
}

