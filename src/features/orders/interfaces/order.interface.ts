import { Branch } from "../../branches/interfaces/branch.interface";
import { Warehouse } from "../../warehouses/interfaces/warehouse.interface";

export type OrderStatus =
  | "Pendiente"
  | "Parcial"
  | "Completo"
  | "Cancelado";

export interface OrderItem {
  sku: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
  descuento: number;
  importe: number;
  tallas?: {
    tallaId: number;
    nombre: string;
    cantidad: number;
  }[];
  bordados?: {
    activo: boolean;
    nuevoPonchado: boolean;
    observaciones?: string;
    especificaciones: {
      posicionCodigo: string;
      posicionNombre: string;
      ancho: number;
      alto: number;
      colorHilo: string;
    }[];
  };
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
  tipoDocumento: string;
  origen: string[];
  destinatario: string;
  empresaEnvio: string;
  telefonoEnvio: string;
  celularEnvio: string;
  direccionEnvio: string;
  coloniaEnvio: string;
  codigoPostalEnvio: string;
  ciudadEnvio: string;
  estadoEnvio: string;
  referenciasEnvio?: string;
  enviarDomicilioFiscal: boolean;
  embarcarConOtrosPedidos: boolean;
  empaqueEcologico: boolean;
  embarqueParcial: boolean;
  comentariosParcialidad?: string;
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
