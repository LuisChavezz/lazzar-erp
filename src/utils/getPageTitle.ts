const ROUTE_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/config": "Configuración",
  "/system": "Panel de Control",
  "/sales": "CRM y Ventas",
  "/wms": "Operaciones de Almacén (WMS)",
  "/procurement": "Compras y SCM",
  "/manufacturing": "Manufactura (Producción)",
  "/finance": "Finanzas y Contabilidad",
  "/hr": "Capital Humano (HR)",
  "/operations": "Mesa de Control",
  "/operations/quotes": "Cotizaciones",
  "/operations/orders": "Pedidos",
  "/operations/samples": "Muestras",
  "/operations/customers": "Clientes",
  "/sales/quotes": "Cotizaciones",
  "/sales/quotes/new": "Nueva Cotización",
  "/sales/customers": "Clientes",
  "/sales/emails": "Correos",
  "/sales/calendar": "Calendario",
  "/procurement/purchase-orders": "Órdenes de Compra",
  "/procurement/purchase-order-receipts": "Recepciones",
  "/procurement/suppliers": "Proveedores",
  "/procurement/order-reviews": "Revisión de Pedidos",
  "/procurement/expense-requests": "Solicitudes de Gastos",
  "/procurement/pq-orders": "Pedidos P.Q.",
  "/manufacturing/production-orders": "Órdenes de Producción",
  "/manufacturing/embroidery": "Órdenes de Bordado",
  "/manufacturing/reflective-orders": "Órdenes de Reflejante",
  "/manufacturing/corte-manga": "Órdenes de Corte de Manga",
  "/manufacturing/cedicor-product-development-orders": "Cedicor - Nuevo Desarrollo",
  "/manufacturing/cedicor-production-orders": "Cedicor - Producción",
  "/wms/stock": "Existencias",
  "/wms/receipts": "Recepciones",
  "/wms/locations": "Ubicaciones",
  "/wms/picking": "Picking",
  "/wms/packing": "Packing",
  "/wms/shipping": "Envío",
  "/wms/rfid-labels": "Etiquetas RFID",
  "/wms/rfid-scanner": "Scanner RFID",
  "/finance/invoicing": "Facturación",
  "/finance/accounts-payable": "CxP (Pagar)",
  "/finance/accounts-receivable": "CxC (Cobrar)",
  "/finance/bank-accounts": "Bancos",
  "/finance/accounting": "Contabilidad",
  "/finance/accounting-customers": "Clientes",
  "/finance/price-lists": "Lista de Precios",
  "/system/reports": "Reportes",
};

export function getPageTitle(path: string | undefined | null): string {
  if (!path) return "Dashboard";
  
  // 1. Búsqueda exacta
  if (ROUTE_TITLES[path]) {
    return ROUTE_TITLES[path];
  }

  // 2. Búsqueda por prefijo para sub-rutas (ej: /config/algo)
  // Buscamos la coincidencia más larga para manejar rutas anidadas correctamente si existieran
  const matchedKey = Object.keys(ROUTE_TITLES)
    .filter(key => key !== '/' && path.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  
  if (matchedKey) {
    return ROUTE_TITLES[matchedKey];
  }

  // 3. Fallback genérico: Formato legible del último segmento
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  
  if (!lastSegment) return "Inicio";

  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
