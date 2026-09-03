import type { ComponentType, SVGProps } from "react";
import {
  CapitalHumanoIcon,
  ClientesIcon,
  ClipboardListIcon,
  ClockIcon,
  LayersIcon,
  UserIcon,
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
  RouteIcon,
  PackingIcon,
  EmbarquesIcon,
  LabelsIcon,
  ScanLineIcon,
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

/**
 * Todos los permisos que dan acceso a ALGUNA pantalla del módulo: el del propio
 * módulo más el de cada una de sus secciones.
 *
 * Lo consumen los puntos de ENTRADA (tarjetas de Home, item de módulo del
 * sidebar) con `hasAnyPermission`. Usar solo `group.permission` dejaría sin
 * enlace a quien tenga una sección pero no el módulo, que es justo la
 * granularidad que persigue el catálogo.
 */
export const getGroupAccessPermissions = (group: AppRouteGroup): string[] => [
  ...new Set(
    [group.permission, ...group.items.map((item) => item.permission)].filter(
      (permission): permission is string => Boolean(permission)
    )
  ),
];

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
        permission: "R-CORE-REPORTES",
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
        permission: "R-CRM-CLIENTES",
      },
      {
        key: "sales-customer",
        label: "Cliente",
        path: "/sales/customers/[id]",
        icon: ClientesIcon,
        permission: "R-CRM-CLIENTES",
        parentPath: "/sales/customers",
        showInSidebar: false,
      },
      {
        key: "sales-quotes",
        label: "Cotizaciones",
        path: "/sales/quotes",
        icon: PedidosIcon,
        permission: "R-CRM-COTIZACIONES",
      },
      {
        key: "sales-quotes-new",
        label: "Nuevo Cotización",
        path: "/sales/quotes/new",
        icon: PedidosIcon,
        // Debe coincidir con la regla de esta MISMA ruta en `routePermissions`
        // ("/sales/quotes/new" → C-CRM-COTIZACIONES): el alta exige el código de
        // creación, no el de lectura de la sección.
        permission: "C-CRM-COTIZACIONES",
        parentPath: "/sales/quotes",
        showInSidebar: false,
      },
      {
        key: "sales-quotes-edit",
        label: "Editar Cotización",
        path: "/sales/quotes/[id]/edit",
        icon: PedidosIcon,
        permission: "R-CRM-COTIZACIONES",
        parentPath: "/sales/quotes",
        showInSidebar: false,
      },
      {
        key: "sales-orders",
        label: "Mis Pedidos",
        path: "/sales/orders",
        icon: PedidosIcon,
        description: "Pedidos originados en las cotizaciones que creaste.",
        permission: "R-CRM-PEDIDOS",
      },
      {
        key: "sales-emails",
        label: "Correos",
        path: "/sales/emails",
        icon: EmailIcon,
        permission: "R-CRM-CORREOS",
      },
      {
        key: "sales-calendar",
        label: "Calendario",
        path: "/sales/calendar",
        icon: TasksIcon,
        permission: "R-CRM-CALENDAR",
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
        permission: "R-WMS-PEDIDOS",
      },
      {
        key: "wms-stock",
        label: "Existencias",
        path: "/wms/stock",
        icon: ExistenciasIcon,
        permission: "R-WMS-EXISTENCIAS",
      },
      {
        key: "wms-receipts",
        label: "Recepciones",
        path: "/wms/receipts",
        icon: RecepcionesIcon,
        permission: "R-WMS-RECEPCIONES"
      },
      // OCULTO EN NAVEGACION: usa datos mock (src/features/locations/mocks/locations-dashboard.mock.ts:11). Restaurar cuando el backend exponga el endpoint real.
      // Sin código de sección en el catálogo (no existe R-WMS-UBICACIONES): al
      // restaurarse se queda a nivel de módulo salvo que se dé de alta el código.
      // {
      //   key: "wms-locations",
      //   label: "Ubicaciones",
      //   path: "/wms/locations",
      //   icon: MapPinIcon,
      //   permission: "R-WMS",
      // },
      {
        key: "wms-picking",
        label: "Picking",
        path: "/wms/picking",
        icon: RouteIcon,
        description: "Surtido de pedidos: recolección de productos en almacén.",
        permission: "R-WMS-PICKING",
      },
      {
        key: "wms-packing",
        label: "Packing",
        path: "/wms/packing",
        icon: PackingIcon,
        description: "Empaque de mercancía surtida por picking.",
        permission: "R-WMS-PACKING",
      },
      {
        key: "wms-shipping",
        label: "Envío",
        path: "/wms/shipping",
        icon: EmbarquesIcon,
        description: "Entrega de cajas empacadas al transportista.",
        permission: "R-WMS-ENVIO",
      },
      {
        key: "wms-rfid-labels",
        label: "Etiquetas RFID",
        path: "/wms/rfid-labels",
        icon: LabelsIcon,
        description: "Consulta de etiquetas de producto: vista previa, ZPL generado y estatus de impresión.",
        permission: "R-WMS-ETIQUETAS",
      },
      {
        key: "wms-rfid-scanner",
        label: "Scanner RFID",
        path: "/wms/rfid-scanner",
        icon: ScanLineIcon,
        description: "Monitor en vivo del lector RFID: lecturas recibidas y su match contra las etiquetas impresas.",
        permission: "R-WMS-SCANNER",
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
        permission: "R-COMPRAS-PEDIDOS",
      },
      {
        key: "procurement-orders",
        label: "Órdenes de Compra",
        path: "/procurement/purchase-orders",
        icon: OrdenesIcon,
        permission: "R-COMPRAS-OC",
      },
      {
        key: "procurement-purchase-order-receipts",
        label: "Recepciones",
        path: "/procurement/purchase-order-receipts",
        icon: RecepcionesIcon,
        description: "Recepciones generadas a partir de órdenes de compra.",
        permission: "R-COMPRAS-RECEP",
      },
      {
        key: "procurement-suppliers",
        label: "Proveedores",
        path: "/procurement/suppliers",
        icon: ComprasIcon,
        description: "Catálogo de proveedores registrados en el sistema.",
        permission: "R-COMPRAS-PROV",
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
        permission: "R-PRODUCCION-OP",
      },
      {
        key: "manufacturing-embroidery",
        label: "Órdenes de Bordado",
        path: "/manufacturing/embroidery",
        icon: ScissorsIcon,
        permission: "R-PRODUCCION-OB",
      },
      {
        key: "manufacturing-reflective-orders",
        label: "Órdenes de Reflejante",
        path: "/manufacturing/reflective-orders",
        icon: RulerIcon,
        description: "Órdenes de trabajo para la aplicación de cinta reflejante sobre las prendas del pedido.",
        permission: "R-PRODUCCION-OR",
      },
      {
        key: "manufacturing-corte-manga",
        label: "Órdenes de Corte de Manga",
        path: "/manufacturing/corte-manga",
        icon: SliceIcon,
        description: "Órdenes de trabajo para el corte de manga de las prendas del pedido.",
        permission: "R-PRODUCCION-CM",
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
        permission: "R-CONTABILIDAD-FACTURACION",
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
        permission: "R-CONTABILIDAD-CXC",
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
        permission: "R-CONTABILIDAD-CLIENTES",
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
    items: [
      {
        key: "hr-employees",
        label: "Empleados",
        path: "/hr/employees",
        icon: UserIcon,
        description: "Plantilla de la organización.",
        permission: "R-RH",
      },
      {
        key: "hr-areas",
        label: "Áreas",
        path: "/hr/areas",
        icon: LayersIcon,
        description: "Áreas operativas de cada departamento.",
        permission: "R-RH",
      },
      {
        key: "hr-positions",
        label: "Puestos",
        path: "/hr/positions",
        icon: ClipboardListIcon,
        description: "Catálogo de puestos y su área asignada.",
        permission: "R-RH",
      },
      {
        key: "hr-shifts",
        label: "Turnos",
        path: "/hr/shifts",
        icon: ClockIcon,
        description: "Horarios, días laborales y tolerancia de retardo.",
        permission: "R-RH",
      },
    ],
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
        permission: "R-MESACONTROL-COTI",
      },
      {
        key: "operations-orders",
        label: "Pedidos",
        path: "/operations/orders",
        icon: PedidosIcon,
        permission: "R-MESACONTROL-PEDIDOS",
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
        permission: "R-MESACONTROL-CLIENTES",
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
