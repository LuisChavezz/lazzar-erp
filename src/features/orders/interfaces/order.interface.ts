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
  clienteBusqueda?: string;
  clienteNombre: string;
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  direccionFiscal: string;
  coloniaFiscal: string;
  codigoPostalFiscal: string;
  ciudadFiscal: string;
  estadoFiscal: string;
  giroEmpresa: string;
  personaPagos: string;
  correoFacturas: string;
  telefonoPagos: string;
  ordenCompra: string;
  formaPago: string;
  metodoPago: string;
  usoCfdi: string;
  referenciarOcFactura: boolean;
  condicionPago100Anticipo: boolean;
  condicionPago50Anticipo: boolean;
  condicionPagoVendedorAutoriza: boolean;
  condicionPagoPagoAntesEmbarque: boolean;
  condicionPagoPorConfirmar: boolean;
  condicionPagoOtraCantidad: boolean;
  condicionPagoMonto: number;
  fecha: string;
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
  servicioEnvioActivo: boolean;
  servicioEnvioMonto: number;
  programaBordadosActivo: boolean;
  programaBordadosMonto: number;
  bordadoPantalonesExtrasActivo: boolean;
  bordadoPantalonesExtrasMonto: number;
  bordadoLogotipoIncluido: boolean;
  estatusPedido: OrderStatus;
  docRelacionado: string;
  observaciones?: string;
  capturadoPor: string;
  items: OrderItem[];
  totals: OrderTotals;
}
