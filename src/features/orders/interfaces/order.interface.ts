import { Product } from "../../products/interfaces/product.interface";

export type OrderStatus =
  | "Pendiente"
  | "Parcial"
  | "Completo"
  | "Cancelado";
export type OrderPaymentCondition =
  | "100_anticipo"
  | "50_anticipo"
  | "vendedor_autoriza"
  | "pago_antes_embarque"
  | "por_confirmar"
  | "otra_cantidad";

export interface OrderItem {
  productoId: number;
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
  id: number;
  tipo_pedido: number;
  estatus: number;
  recompra: boolean;
  chat_online: boolean;
  pedido_online: boolean;
  prospeccion: boolean;
  recomendacion: boolean;
  amazon: boolean;
  google: boolean;
  publicidad: boolean;
  mercado_libre: boolean;
  redes_sociales: boolean;
  otro: boolean;
  mailing: boolean;
  persona_pagos: string;
  correo_facturas: string;
  telefono_pagos: string;
  oc: string;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  anticipo_total: boolean;
  anticipo_parcial: boolean;
  vendedor_autoriza: boolean;
  pago_antes_embarque: boolean;
  por_confirmar: boolean;
  otra_cantidad: boolean;
  monto: string;
  empaque_ecologico: boolean;
  embarque_parcial: boolean;
  comentarios_parcialidad: string;
  envio: string;
  programa_bordados: string;
  bordado_pantalones_extras: string;
  bordado_logotipo: boolean;
  observaciones: string;
  flete: string;
  seguros: string;
  anticipo: string;
  subtotal: string;
  descuento_global: string;
  ieps: string;
  iva: number;
  gran_total: string;
  activo: boolean;
  empresa: number;
  sucursal: number;
  cliente: number;
  cotizacion: number | null;
  moneda: number;
  folio?: string;
  fecha?: string;
  agente?: string;
  capturadoPor?: string;
  tipoDocumento?: string;
  clienteNombre?: string;
  estatusPedido?: OrderStatus;
  items?: OrderItem[];
  totals?: OrderTotals;
  clienteBusqueda?: string;
  razonSocial?: string;
  rfc?: string;
  regimenFiscal?: string;
  direccionFiscal?: string;
  coloniaFiscal?: string;
  codigoPostalFiscal?: string;
  ciudadFiscal?: string;
  estadoFiscal?: string;
  giroEmpresa?: string;
  personaPagos?: string;
  correoFacturas?: string;
  telefonoPagos?: string;
  ordenCompra?: string;
  formaPago?: string;
  metodoPago?: string;
  usoCfdi?: string;
  referenciarOcFactura?: boolean;
  condicionPago?: OrderPaymentCondition;
  condicionPagoMonto?: number;
  origen?: string;
  destinatario?: string;
  empresaEnvio?: string;
  telefonoEnvio?: string;
  celularEnvio?: string;
  direccionEnvio?: string;
  coloniaEnvio?: string;
  codigoPostalEnvio?: string;
  ciudadEnvio?: string;
  estadoEnvio?: string;
  referenciasEnvio?: string;
  enviarDomicilioFiscal?: boolean;
  embarcarConOtrosPedidos?: boolean;
  empaqueEcologico?: boolean;
  embarqueParcial?: boolean;
  comentariosParcialidad?: string;
  servicioEnvioActivo?: boolean;
  servicioEnvioMonto?: number;
  programaBordadosActivo?: boolean;
  programaBordadosMonto?: number;
  bordadoPantalonesExtrasActivo?: boolean;
  bordadoPantalonesExtrasMonto?: number;
  bordadoLogotipoIncluido?: boolean;
  estatusPedidoLegacy?: OrderStatus;
  docRelacionado?: string;
  created_at: string;
  updated_at: string;
  fecha_confirmacion: string | null;
}

export interface OrderCreate {
  tipo_pedido: number;
  estatus: number;
  recompra: boolean;
  chat_online: boolean;
  pedido_online: boolean;
  prospeccion: boolean;
  recomendacion: boolean;
  amazon: boolean;
  google: boolean;
  publicidad: boolean;
  mercado_libre: boolean;
  redes_sociales: boolean;
  otro: boolean;
  mailing: boolean;
  persona_pagos: string;
  correo_facturas: string;
  telefono_pagos: string;
  oc: string;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  anticipo_total: boolean;
  anticipo_parcial: boolean;
  vendedor_autoriza: boolean;
  pago_antes_embarque: boolean;
  por_confirmar: boolean;
  otra_cantidad: boolean;
  monto: string;
  empaque_ecologico: boolean;
  embarque_parcial: boolean;
  comentarios_parcialidad?: string;
  envio: string;
  programa_bordados: string;
  bordado_pantalones_extras: string;
  bordado_logotipo: boolean;
  observaciones?: string;
  flete: string;
  seguros: string;
  anticipo: string;
  subtotal: string;
  descuento_global: string;
  ieps: string;
  iva: number;
  gran_total: string;
  activo: boolean;
  sucursal: number;
  cliente: number;
  moneda: number;
}

export interface OrderProductDetailCreate {
  pedido: Order["id"];
  producto: Product["id"];
  precio_unitario: string;
  costo_unitario: string;
  subtotal_linea: string;
}
