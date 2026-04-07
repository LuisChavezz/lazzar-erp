import { Branch } from "../../branches/interfaces/branch.interface";
import { Company } from "../../companies/interfaces/company.interface";
import { Currency } from "../../currency/interfaces/currency.interface";
import { Product } from '../../products/interfaces/product.interface';
import { Size } from '../../sizes/interfaces/size.interface';


export type QuotePaymentCondition =
  | "100_anticipo"
  | "50_anticipo"
  | "vendedor_autoriza"
  | "pago_antes_embarque"
  | "por_confirmar"
  | "otra_cantidad";

export interface QuoteItem {
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
      ancho?: number;
      alto?: number;
      colorHilo?: string;
      imagen: string;
    }[];
  };
  reflejantes?: {
    activo: boolean;
    observaciones?: string;
    especificaciones: {
      opcion: string;
      posicion: string;
      tipo: string;
    }[];
  }
}

export interface Quote {
  id: number;
  estatus: number;
  estatus_label: string;
  cliente: number;
  cliente_nombre: string;
  cliente_razon_social: string;
  oc: string;
  uso_cfdi: string;
  gran_total: string;
  importe_sin_iva: string;
  piezas: number;  
  autorizada_at: string | null;
  cambios_solicitados_at: string | null;
  created_at: string;
  updated_at: string;
  pedido_id: number | null;
  pedido_folio: string | null;
}

export interface QuoteById {
  id: number;
  estatus_label: string;
  detalles: {
    id: number;
    tallas: {
      id: number;
      talla_nombre: string;
      cantidad: number;
      precio_unitario: string;
      subtotal_talla: string;
      lleva_bordado: boolean;
      bordado_config: {
        notas: string;
        ubicaciones: {
          codigo: string;
          ancho_cm: number;
          alto_cm: number;
          color_hilo: string | null;
          imagen: string;
        }[];
      };
      cotizacion_detalle: number;
      talla: number;
    }[];
    precio_unitario: string;
    costo_unitario: string | null;
    subtotal_linea: string;
    cotizacion: number;
    producto: number;
    producto_nombre: string;
  }[];
  cliente_nombre: string;
  cliente_razon_social: string;
  estatus: number;
  autorizada_at: string | null;
  cambios_solicitados_at: string | null;
  aprobado_snapshot: string | null;
  created_at: string;
  updated_at: string;
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
  destinatario: string | null;
  empresa_envio: string | null;
  telefono_envio: string | null;
  celular_envio: string | null;
  direccion_envio: string | null;
  colonia_envio: string | null;
  codigo_postal: string | null;
  ciudad_envio: string | null;
  estado_envio: string | null;
  referencias: string | null;
  envio: string;
  programa_bordados: string;
  bordado_pantalones_extras: string;
  bordado_logotipo: boolean;
  serigrafia: string;
  reflejante: string;
  observaciones: string;
  flete: string;
  seguros: string;
  anticipo: string;
  subtotal: string;
  descuento_global: string;
  ieps: string;
  iva: number;
  gran_total: string;
  empresa: number;
  vendedor: number;
  sucursal: number;
  cliente: number;
  oportunidad: number | null;
  moneda: number;
}

export interface QuoteCreate {
  pedido: {
    empresa: Company["id"];
    sucursal: Branch["id"];
    cliente: number;
    moneda: Currency["id"];
    persona_pagos: string;
    correo_facturas: string;
    telefono_pagos: string;
    forma_pago: string;
    metodo_pago: string;
    uso_cfdi: string;
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
    oc: string;
    anticipo_total: boolean;
    anticipo_parcial: boolean;
    vendedor_autoriza: boolean;
    pago_antes_embarque: boolean;
    por_confirmar: boolean;
    otra_cantidad: boolean;
    monto: string;
    empaque_ecologico: boolean;
    cliente_razon_social: string;
    cliente_nombre: string;
    cliente_rfc: string;
    cliente_regimen_fiscal: number;
    cliente_direccion_fiscal: string;
    cliente_colonia: string;
    cliente_codigo_postal: string;
    cliente_ciudad: string;
    cliente_estado: string;
    cliente_giro_empresarial: string;
    destinatario: string;
    empresa_envio: string;
    telefono_envio: string;
    celular_envio: string;
    direccion_envio: string;
    colonia_envio: string;
    codigo_postal: string;
    ciudad_envio: string;
    estado_envio: string;
    referencias: string;
    embarque_parcial: boolean;
    comentarios_parcialidad: string;
    observaciones: string;
    envio: string;
    programa_bordados: string;
    bordado_pantalones_extras: string;
    serigrafia: string;
    reflejante: string;
    bordado_logotipo: boolean;
    flete: string;
    seguros: string;
    anticipo: string;
    subtotal: string;
    descuento_global: string;
    ieps: string;
    iva: number;
    gran_total: string;
    activo: boolean;
    cotización: { id: number }
  },
  detalle: QuoteDetail[]
}

interface QuoteDetail {
  producto: Product["id"];
  tallas: {
    talla: Size["id"];
    cantidad: number;
    lleva_bordado: boolean;
    bordado_config: {
      ubicaciones: {
        codigo: string;
        ancho_cm: number;
        alto_cm: number;
        color_hilo: string | null;
        imagen: string;
      }[];
      notas: string;
    };
  }[];
}

export interface QuoteOnboardingData {
  vendedor: {
    id: number;
    username: string;
    email: string;
    empresa_id: Company["id"];
  },
  catalogos: {
    formas_pago: {
      value: string;
      label: string;
    }[],
    metodos_pago: {
      value: string;
      label: string;
    }[],
    usos_cfdi: {
      value: string;
      label: string;
    }[],
    regimenes_fiscales: {
      value: string;
      label: string;
    }[],
    tipos_pedido: {
      value: number;
      label: string;
    }[],
    tallas: Size[]
  },
  busqueda: {
    clientes: {
      id: number;
      razon_social: string;
      nombre: string;
      rfc: string;
      correo: string;
      telefono: string;
      direccion_fiscal: string;
      colonia: string;
      codigo_postal: string;
      ciudad: string;
      estado: string;
      giro_empresarial: string;
      sat_regimen_fiscal_id: number;
      sat_regimen_fiscal__codigo: string;
      sat_regimen_fiscal__descripcion: string;
    }[];
    productos: Partial<Product>[]
  }
}
