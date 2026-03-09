import type { ComponentType, SVGProps } from "react";
import {
  BancosIcon,
  CapitalHumanoIcon,
  ClientesIcon,
  ComprasIcon,
  ContabilidadIcon,
  CxcIcon,
  CxpIcon,
  DashboardIcon,
  EmbarquesIcon,
  ExistenciasIcon,
  FacturacionIcon,
  InventariosIcon,
  ListaPreciosIcon,
  OrdenesIcon,
  PedidosIcon,
  ProduccionIcon,
  RastrearGuiasIcon,
  RecepcionesIcon,
  ReportesIcon,
  SettingsIcon,
} from "../components/Icons";

export interface AppRouteItem {
  key: string;
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
  permission?: string;
  parentPath?: string;
  showInSidebar?: boolean;
}

export interface AppRouteGroup {
  key: string;
  label: string;
  description?: string;
  moduleLabel: string;
  modulePath: string;
  moduleDescription?: string;
  moduleIcon: ComponentType<SVGProps<SVGSVGElement>>;
  showInHome?: boolean;
  items: AppRouteItem[];
}

export const appRouteGroups: AppRouteGroup[] = [
  {
    key: "system",
    label: "Configuración del sistema",
    description: "Catálogos base, seguridad y administración del sistema.",
    moduleLabel: "Panel de Control (Core)",
    modulePath: "/system",
    moduleDescription: "Empresas, usuarios, seguridad y catálogos base del sistema.",
    moduleIcon: DashboardIcon,
    showInHome: true,
    items: [
      {
        key: "system-reports",
        label: "Reportes",
        path: "/system/reports",
        icon: ReportesIcon,
        description: "Tablero de reportes operativos, financieros y comerciales.",
        permission: "R-REPO",
      },
    ],
  },
  {
    key: "sales",
    label: "CRM y ventas",
    description: "Prospectos, oportunidades, pedidos y clientes.",
    moduleLabel: "CRM y Ventas",
    modulePath: "/sales",
    moduleDescription: "Prospectos, oportunidades, actividades, cotizaciones y pedidos centralizados.",
    moduleIcon: ClientesIcon,
    showInHome: true,
    items: [
      {
        key: "sales-customers",
        label: "Clientes",
        path: "/sales/customers",
        icon: ClientesIcon,
        permission: "R-CLIE",
      },
      {
        key: "sales-orders",
        label: "Pedidos",
        path: "/sales/orders",
        icon: PedidosIcon,
        permission: "R-PEDID",
      },
      {
        key: "sales-orders-new",
        label: "Nuevo Pedido",
        path: "/sales/orders/new",
        icon: PedidosIcon,
        permission: "R-PEDID",
        parentPath: "/sales/orders",
        showInSidebar: false,
      },
      {
        key: "sales-orders-edit",
        label: "Editar Pedido",
        path: "/sales/orders/edit/[id]",
        icon: PedidosIcon,
        permission: "R-PEDID",
        parentPath: "/sales/orders",
        showInSidebar: false,
      },
    ],
  },
  {
    key: "wms",
    label: "Operaciones de almacén - WMS",
    description: "Inventario, ubicaciones, movimientos y embarques.",
    moduleLabel: "Operaciones de Almacén",
    modulePath: "/wms",
    moduleDescription: "Inventario, ubicaciones, movimientos, picking, packing y transferencias.",
    moduleIcon: InventariosIcon,
    showInHome: true,
    items: [
      {
        key: "wms-inventories",
        label: "Inventarios",
        path: "/wms/inventories",
        icon: InventariosIcon,
        permission: "R-INVE",
      },
      {
        key: "wms-stock",
        label: "Existencias",
        path: "/wms/stock",
        icon: ExistenciasIcon,
        permission: "R-EXIS",
      },
      {
        key: "wms-shipments",
        label: "Embarques",
        path: "/wms/shipments",
        icon: EmbarquesIcon,
        permission: "R-EMBA",
      },
      {
        key: "wms-shipment-tracking",
        label: "Rastrear Guías",
        path: "/wms/shipment-tracking",
        icon: RastrearGuiasIcon,
        permission: "R-GUIA",
      },
    ],
  },
  {
    key: "procurement",
    label: "Compras y abastecimiento",
    description: "Requisiciones, compras y recepciones.",
    moduleLabel: "Compras y SCM",
    modulePath: "/procurement",
    moduleDescription: "Requisiciones, cotizaciones proveedor, órdenes de compra y recepciones.",
    moduleIcon: ComprasIcon,
    showInHome: true,
    items: [
      {
        key: "procurement-orders-menu",
        label: "Órdenes",
        path: "/procurement/orders-menu",
        icon: OrdenesIcon,
        permission: "R-ORDE",
      },
      {
        key: "procurement-receipts",
        label: "Recepciones",
        path: "/procurement/receipts",
        icon: RecepcionesIcon,
        permission: "R-RECE",
      },
    ],
  },
  {
    key: "manufacturing",
    label: "Producción",
    description: "BOM, rutas y producción.",
    moduleLabel: "Manufactura (Producción)",
    modulePath: "/manufacturing",
    moduleDescription: "BOM, rutas, órdenes de producción, avances y consumos de material.",
    moduleIcon: SettingsIcon,
    showInHome: true,
    items: [
      {
        key: "manufacturing-production",
        label: "Producción",
        path: "/manufacturing/production",
        icon: ProduccionIcon,
        permission: "R-PROD",
      },
    ],
  },
  {
    key: "finance",
    label: "Finanzas y contabilidad",
    description: "Facturación, cuentas y bancos.",
    moduleLabel: "Finanzas y Contabilidad",
    modulePath: "/finance",
    moduleDescription: "Facturación, CxC, CxP, tesorería, bancos y contabilidad general.",
    moduleIcon: ListaPreciosIcon,
    showInHome: true,
    items: [
      {
        key: "finance-invoicing",
        label: "Facturación",
        path: "/finance/invoicing",
        icon: FacturacionIcon,
        permission: "R-FACT",
      },
      {
        key: "finance-accounts-payable",
        label: "CxP (Pagar)",
        path: "/finance/accounts-payable",
        icon: CxpIcon,
        permission: "R-CUXP",
      },
      {
        key: "finance-accounts-receivable",
        label: "CxC (Cobrar)",
        path: "/finance/accounts-receivable",
        icon: CxcIcon,
        permission: "R-CUXC",
      },
      {
        key: "finance-bank-accounts",
        label: "Bancos",
        path: "/finance/bank-accounts",
        icon: BancosIcon,
        permission: "R-BANC",
      },
      {
        key: "finance-accounting",
        label: "Contabilidad",
        path: "/finance/accounting",
        icon: ContabilidadIcon,
        permission: "R-CONT",
      },
      {
        key: "finance-price-lists",
        label: "Lista de Precios",
        path: "/finance/price-lists",
        icon: ListaPreciosIcon,
        permission: "R-PREC",
      },
    ],
  },
  {
    key: "hr",
    label: "Capital humano",
    description: "Plantilla, nómina y asistencia.",
    moduleLabel: "Capital Humano (HR)",
    modulePath: "/hr",
    moduleDescription: "Plantilla, asistencia, nómina y desempeño del talento de la organización.",
    moduleIcon: CapitalHumanoIcon,
    showInHome: true,
    items: [],
  },
  {
    key: "other",
    label: "Otros módulos",
    description: "Proyectos, marketing y e-commerce.",
    moduleLabel: "Otros Módulos",
    modulePath: "/other",
    moduleDescription: "Proyectos, e-commerce, canales digitales, marketing y campañas segmentadas.",
    moduleIcon: DashboardIcon,
    showInHome: true,
    items: [],
  },
  {
    key: "config",
    label: "Configuración",
    description: "Parámetros y catálogos del sistema.",
    moduleLabel: "Configuración",
    modulePath: "/config",
    moduleDescription: "Parámetros generales y catálogos maestros.",
    moduleIcon: SettingsIcon,
    showInHome: false,
    items: [],
  },
];
