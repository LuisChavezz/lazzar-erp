import { Branch } from "../../branches/interfaces/branch.interface";
import { Warehouse } from "../../warehouses/interfaces/warehouse.interface";

export type OrderStatus =
  | "capturado"
  | "autorizado"
  | "surtido"
  | "facturado"
  | "cancelado";

export interface OrderItem {
  sku: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
  descuento: number;
  importe: number;
}

export interface OrderTotals {
  subtotal: number;
  descuentoTotal: number;
  ivaAmount: number;
  granTotal: number;
  saldoPendiente: number;
  flete: number;
  seguro: number;
  anticipo: number;
  ivaRate: number;
}

export interface Order {
  id: string;
  folio: string;
  clienteId: string;
  clienteNombre: string;
  pedidoCliente: string;
  fecha: string;
  fechaVence: string;
  agente: string;
  comision: number;
  plazo: number;
  sucursal: Branch["id"];
  almacen: Warehouse["id_almacen"];
  canal: string;
  puntos: number;
  anticipoReq: number;
  pedidoInicial: boolean;
  estatusPedido: OrderStatus;
  docRelacionado: string;
  observaciones?: string;
  capturadoPor: string;
  items: OrderItem[];
  totals: OrderTotals;
}
