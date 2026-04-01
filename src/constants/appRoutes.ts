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
  TasksIcon,
  UserIcon,
  LockIcon,
  OperationsIcon,
  SamplesIcon,
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
  permission?: string;
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
    permission: "R-CORE",
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
        permission: "R-CORE",
      },
    ],
  },
  {
    key: "sales",
    label: "CRM y ventas",
    description: "Prospectos, oportunidades, pedidos y clientes.",
    permission: "R-CRM",
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
        permission: "R-CRM",
      },
      {
        key: "sales-customer",
        label: "Cliente",
        path: "/sales/customers/[id]",
        icon: ClientesIcon,
        permission: "R-CRM",
        parentPath: "/sales/customers",
        showInSidebar: false,
      },
      {
        key: "sales-quotes",
        label: "Cotizaciones",
        path: "/sales/quotes",
        icon: PedidosIcon,
        permission: "R-CRM",
      },
      {
        key: "sales-quotes-new",
        label: "Nuevo Cotización",
        path: "/sales/quotes/new",
        icon: PedidosIcon,
        permission: "R-CRM",
        parentPath: "/sales/quotes",
        showInSidebar: false,
      },
      {
        key: "sales-tasks",
        label: "Tareas",
        path: "/sales/tasks",
        icon: TasksIcon,
        permission: "R-CRM",
      }
    ],
  },
  {
    key: "wms",
    label: "Operaciones de almacén - WMS",
    description: "Inventario, ubicaciones, movimientos y embarques.",
    permission: "R-WMS",
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
        permission: "R-WMS",
      },
      {
        key: "wms-stock",
        label: "Existencias",
        path: "/wms/stock",
        icon: ExistenciasIcon,
        permission: "R-WMS",
      },
      {
        key: "wms-shipments",
        label: "Embarques",
        path: "/wms/shipments",
        icon: EmbarquesIcon,
        permission: "R-WMS",
      },
      {
        key: "wms-shipment-tracking",
        label: "Rastrear Guías",
        path: "/wms/shipment-tracking",
        icon: RastrearGuiasIcon,
        permission: "R-WMS",
      },
    ],
  },
  {
    key: "procurement",
    label: "Compras y abastecimiento",
    description: "Requisiciones, compras y recepciones.",
    permission: "R-COMPRAS",
    moduleLabel: "Compras y SCM",
    modulePath: "/procurement",
    moduleDescription: "Requisiciones, cotizaciones proveedor, órdenes de compra y recepciones.",
    moduleIcon: ComprasIcon,
    showInHome: true,
    items: [
      {
        key: "procurement-quotes-menu",
        label: "Órdenes",
        path: "/procurement/quotes-menu",
        icon: OrdenesIcon,
        permission: "R-COMPRAS",
      },
      {
        key: "procurement-receipts",
        label: "Recepciones",
        path: "/procurement/receipts",
        icon: RecepcionesIcon,
        permission: "R-COMPRAS",
      },
    ],
  },
  {
    key: "manufacturing",
    label: "Producción",
    description: "BOM, rutas y producción.",
    permission: "R-PRODUCCION",
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
        permission: "R-PRODUCCION",
      },
    ],
  },
  {
    key: "finance",
    label: "Finanzas y contabilidad",
    description: "Facturación, cuentas y bancos.",
    permission: "R-CONTABILIDAD",
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
        permission: "R-CONTABILIDAD",
      },
      {
        key: "finance-accounts-payable",
        label: "CxP (Pagar)",
        path: "/finance/accounts-payable",
        icon: CxpIcon,
        permission: "R-CONTABILIDAD",
      },
      {
        key: "finance-accounts-receivable",
        label: "CxC (Cobrar)",
        path: "/finance/accounts-receivable",
        icon: CxcIcon,
        permission: "R-CONTABILIDAD",
      },
      {
        key: "finance-bank-accounts",
        label: "Bancos",
        path: "/finance/bank-accounts",
        icon: BancosIcon,
        permission: "R-CONTABILIDAD",
      },
      {
        key: "finance-accounting",
        label: "Contabilidad",
        path: "/finance/accounting",
        icon: ContabilidadIcon,
        permission: "R-CONTABILIDAD",
      },
      {
        key: "finance-price-lists",
        label: "Lista de Precios",
        path: "/finance/price-lists",
        icon: ListaPreciosIcon,
        permission: "R-CONTABILIDAD",
      },
    ],
  },
  {
    key: "hr",
    label: "Capital humano",
    description: "Plantilla, nómina y asistencia.",
    permission: "R-RH",
    moduleLabel: "Capital Humano (HR)",
    modulePath: "/hr",
    moduleDescription: "Plantilla, asistencia, nómina y desempeño del talento de la organización.",
    moduleIcon: CapitalHumanoIcon,
    showInHome: true,
    items: [],
  },
  // {
  //   key: "other",
  //   label: "Otros módulos",
  //   description: "Proyectos, marketing y e-commerce.",
  //   permission: "R-OTROS-MODULOS",
  //   moduleLabel: "Otros Módulos",
  //   modulePath: "/other",
  //   moduleDescription: "Proyectos, e-commerce, canales digitales, marketing y campañas segmentadas.",
  //   moduleIcon: DashboardIcon,
  //   showInHome: true,
  //   items: [],
  // },
  {
    key: "operations",
    label: "Mesa de Control",
    description: "Panel de control general de la organización, con visión global de las operaciones y rendimiento.",
    permission: "R-MESACONTROL",
    moduleLabel: "Mesa de Control",
    modulePath: "/operations",
    moduleDescription: "Panel de control general de la organización, con visión global de las operaciones y rendimiento.",
    moduleIcon: OperationsIcon,
    showInHome: true,
    items: [
      {
        key: "operations-quotes",
        label: "Pedidos",
        path: "/operations/quotes",
        icon: PedidosIcon,
        permission: "R-MESACONTROL",
      },
      {
        key: "operations-samples",
        label: "Muestras",
        path: "/operations/samples",
        icon: SamplesIcon,
        permission: "R-MESACONTROL",
      },
    ],
  },
  {
    key: "config",
    label: "Configuración",
    description: "Parámetros y catálogos del sistema.",
    permission: "R-CONFIGURACION",
    moduleLabel: "Configuración",
    modulePath: "/config",
    moduleDescription: "Parámetros generales y catálogos maestros.",
    moduleIcon: SettingsIcon,
    showInHome: false,
    items: [],
  },
  {
    key: "settings",
    label: "Ajustes de cuenta",
    description: "Seguridad y perfil de usuario.",
    moduleLabel: "Ajustes",
    modulePath: "/settings",
    moduleDescription: "Configuración de cuenta, seguridad y perfil.",
    moduleIcon: SettingsIcon,
    showInHome: false,
    items: [
      {
        key: "settings-profile",
        label: "Perfil",
        path: "/settings/profile",
        icon: UserIcon,
      },
      {
        key: "settings-security",
        label: "Seguridad",
        path: "/settings/security",
        icon: LockIcon,
      },
    ],
  },
];
