import type { ComponentType, SVGProps } from "react";
import {
  CapitalHumanoIcon,
  ClientesIcon,
  ComprasIcon,
  CxcIcon,
  DashboardIcon,
  ExistenciasIcon,
  FacturacionIcon,
  InventariosIcon,
  ListaPreciosIcon,
  OrdenesIcon,
  PedidosIcon,
  ReportesIcon,
  SettingsIcon,
  TasksIcon,
  OperationsIcon,
  EmailIcon,
  ScissorsIcon,
  SliceIcon,
  RulerIcon,
  ProduccionIcon,
  RecepcionesIcon,
  TraspasosIcon,
  RouteIcon,
  PackingIcon,
  EmbarquesIcon,
  LabelsIcon,
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
        key: "sales-quotes-edit",
        label: "Editar Cotización",
        path: "/sales/quotes/[id]/edit",
        icon: PedidosIcon,
        permission: "R-CRM",
        parentPath: "/sales/quotes",
        showInSidebar: false,
      },
      {
        key: "sales-orders",
        label: "Mis Pedidos",
        path: "/sales/orders",
        icon: PedidosIcon,
        description: "Pedidos originados en las cotizaciones que creaste.",
        permission: "R-CRM",
      },
      {
        key: "sales-emails",
        label: "Correos",
        path: "/sales/emails",
        icon: EmailIcon,
        permission: "R-CRM",
      },
      {
        key: "sales-calendar",
        label: "Calendario",
        path: "/sales/calendar",
        icon: TasksIcon,
        permission: "R-CRM",
      },
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
        key: "wms-orders",
        label: "Pedidos",
        path: "/wms/orders",
        icon: PedidosIcon,
        description: "Consulta de pedidos y su detalle para planear el surtido en almacén.",
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
        key: "wms-receipts",
        label: "Recepciones",
        path: "/wms/receipts",
        icon: RecepcionesIcon,
        permission: "R-WMS"
      },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/locations/mocks/locations-dashboard.mock.ts:11). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "wms-locations",
      //   label: "Ubicaciones",
      //   path: "/wms/locations",
      //   icon: MapPinIcon,
      //   permission: "R-WMS",
      // },
      {
        key: "wms-stock-transfers",
        label: "Traspasos",
        path: "/wms/stock-transfers",
        icon: TraspasosIcon,
        description: "Traspasos de existencias entre almacenes.",
        permission: "R-WMS",
      },
      {
        key: "wms-picking",
        label: "Picking",
        path: "/wms/picking",
        icon: RouteIcon,
        description: "Surtido de pedidos: recolección de productos en almacén.",
        permission: "R-WMS",
      },
      {
        key: "wms-packing",
        label: "Packing",
        path: "/wms/packing",
        icon: PackingIcon,
        description: "Empaque de mercancía surtida por picking.",
        permission: "R-WMS",
      },
      {
        key: "wms-dispatch",
        label: "Despacho",
        path: "/wms/dispatch",
        icon: EmbarquesIcon,
        description: "Entrega de cajas empacadas al transportista para su envío.",
        permission: "R-WMS",
      },
      {
        key: "wms-rfid-labels",
        label: "Etiquetas RFID",
        path: "/wms/rfid-labels",
        icon: LabelsIcon,
        description: "Consulta de etiquetas de producto: vista previa, ZPL generado y estatus de impresión.",
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
        key: "procurement-sales-orders",
        label: "Pedidos",
        path: "/procurement/orders",
        icon: PedidosIcon,
        description: "Consulta de pedidos y su detalle para planear el abastecimiento.",
        permission: "R-COMPRAS",
      },
      {
        key: "procurement-orders",
        label: "Órdenes de Compra",
        path: "/procurement/purchase-orders",
        icon: OrdenesIcon,
        permission: "R-COMPRAS",
      },
      {
        key: "procurement-purchase-order-receipts",
        label: "Recepciones",
        path: "/procurement/purchase-order-receipts",
        icon: RecepcionesIcon,
        description: "Recepciones generadas a partir de órdenes de compra.",
        permission: "R-COMPRAS",
      },
      {
        key: "procurement-suppliers",
        label: "Proveedores",
        path: "/procurement/suppliers",
        icon: ComprasIcon,
        description: "Catálogo de proveedores registrados en el sistema.",
        permission: "R-COMPRAS",
      },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/purchase-order-reviews/mocks/purchase-order-review.mock.ts:11). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "procurement-order-reviews",
      //   label: "Revisión de Pedidos",
      //   path: "/procurement/order-reviews",
      //   icon: ComprasIcon,
      //   description: "Seguimiento del flujo completo de revisión de pedidos: desde la solicitud hasta el cierre con CxP.",
      //   permission: "R-COMPRAS",
      // },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/expense-purchase-requests/mocks/expense-purchase-request.mock.ts:14). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "procurement-expense-requests",
      //   label: "Solicitudes de Gastos",
      //   path: "/procurement/expense-requests",
      //   icon: CxpIcon,
      //   description: "Gestión de solicitudes de compras de gastos: desde el requerimiento hasta el cierre con Cobranza.",
      //   permission: "R-COMPRAS",
      // },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/pq-orders/mocks/pq-order.mock.ts:14). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "procurement-pq-orders",
      //   label: "Pedidos P.Q.",
      //   path: "/procurement/pq-orders",
      //   icon: PedidosIcon,
      //   description: "Seguimiento de pedidos de quincena vinculados a órdenes de compra: desde la generación hasta el surtido.",
      //   permission: "R-COMPRAS",
      // },
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
        key: "manufacturing-production-orders",
        label: "Órdenes de Producción",
        path: "/manufacturing/production-orders",
        icon: ProduccionIcon,
        description: "Gestión del flujo de órdenes de producción: verificación de materiales, fabricación, avances y cierre.",
        permission: "R-PRODUCCION",
      },
      {
        key: "manufacturing-embroidery",
        label: "Órdenes de Bordado",
        path: "/manufacturing/embroidery",
        icon: ScissorsIcon,
        permission: "R-PRODUCCION",
      },
      {
        key: "manufacturing-reflective-orders",
        label: "Órdenes de Reflejante",
        path: "/manufacturing/reflective-orders",
        icon: RulerIcon,
        description: "Órdenes de trabajo para la aplicación de cinta reflejante sobre las prendas del pedido.",
        permission: "R-PRODUCCION",
      },
      {
        key: "manufacturing-corte-manga",
        label: "Órdenes de Corte de Manga",
        path: "/manufacturing/corte-manga",
        icon: SliceIcon,
        description: "Órdenes de trabajo para el corte de manga de las prendas del pedido.",
        permission: "R-PRODUCCION",
      },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/cedicor/mocks/cedicor-new-development.mock.ts:11). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "manufacturing-cedicor-product-development-orders",
      //   label: "Cedicor - Nuevo Desarrollo",
      //   path: "/manufacturing/cedicor-product-development-orders",
      //   icon: FactoryIcon,
      //   description: "Seguimiento del flujo de producción para nuevos desarrollos de producto.",
      //   permission: "R-PRODUCCION",
      // },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/cedicor/mocks/cedicor-production-order.mock.ts:11). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "manufacturing-cedicor-production-orders",
      //   label: "Cedicor - Producción",
      //   path: "/manufacturing/cedicor-production-orders",
      //   icon: FactoryIcon,
      //   description: "Gestión de órdenes de producción para artículos de resurtido y stock.",
      //   permission: "R-PRODUCCION",
      // },
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
      // OCULTO EN NAVEGACION: usa datos mock (src/features/accounts-payable/mocks/accounts-payable.mock.ts:15). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "finance-accounts-payable",
      //   label: "CxP (Pagar)",
      //   path: "/finance/accounts-payable",
      //   icon: CxpIcon,
      //   permission: "R-CONTABILIDAD",
      // },
      {
        key: "finance-accounts-receivable",
        label: "CxC (Cobrar)",
        path: "/finance/accounts-receivable",
        icon: CxcIcon,
        permission: "R-CONTABILIDAD",
      },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/bank-accounts/components/BankAccountsList.tsx:5, arreglo literal). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "finance-bank-accounts",
      //   label: "Bancos",
      //   path: "/finance/bank-accounts",
      //   icon: BancosIcon,
      //   permission: "R-CONTABILIDAD",
      // },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/accounting/mocks/accounting.mock.ts:18). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "finance-accounting",
      //   label: "Contabilidad",
      //   path: "/finance/accounting",
      //   icon: ContabilidadIcon,
      //   permission: "R-CONTABILIDAD",
      // },
      {
        key: "finance-accounting-customers",
        label: "Clientes",
        path: "/finance/accounting-customers",
        icon: ClientesIcon,
        permission: "R-CONTABILIDAD",
      },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/price-lists/components/PriceListList.tsx:5, arreglo literal). Restaurar cuando el backend exponga el endpoint real.
      // {
      //   key: "finance-price-lists",
      //   label: "Lista de Precios",
      //   path: "/finance/price-lists",
      //   icon: ListaPreciosIcon,
      //   permission: "R-CONTABILIDAD",
      // },
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
        label: "Cotizaciones",
        path: "/operations/quotes",
        icon: PedidosIcon,
        permission: "R-MESACONTROL",
      },
      {
        key: "operations-orders",
        label: "Pedidos",
        path: "/operations/orders",
        icon: PedidosIcon,
        permission: "R-MESACONTROL",
      },
      // OCULTO EN NAVEGACION: pagina placeholder sin datos. Restaurar cuando tenga implementacion real.
      // {
      //   key: "operations-samples",
      //   label: "Muestras",
      //   path: "/operations/samples",
      //   icon: SamplesIcon,
      //   permission: "R-MESACONTROL",
      // },
      {
        key: "operations-customers",
        label: "Clientes",
        path: "/operations/customers",
        icon: ClientesIcon,
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
];
