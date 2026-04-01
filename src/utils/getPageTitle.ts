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
  "/other": "Otros módulos",
  "/operations": "Mesa de Control",
  "/operations/quotes": "Pedidos",
  "/sales/quotes": "Cotizaciones",
  "/sales/quotes/new": "Nueva Cotización",
  "/sales/customers": "Clientes",
  "/procurement/quotes-menu": "Órdenes",
  "/procurement/receipts": "Recepciones",
  "/manufacturing/production": "Producción",
  "/wms/inventories": "Inventarios",
  "/wms/stock": "Existencias",
  "/wms/shipments": "Embarques",
  "/wms/shipment-tracking": "Rastrear Guías",
  "/finance/invoicing": "Facturación",
  "/finance/accounts-payable": "CxP (Pagar)",
  "/finance/accounts-receivable": "CxC (Cobrar)",
  "/finance/bank-accounts": "Bancos",
  "/finance/accounting": "Contabilidad",
  "/finance/price-lists": "Lista de Precios",
  "/system/reports": "Reportes",
  "/settings": "Ajustes",
  "/settings/profile": "Perfil",
  "/settings/security": "Seguridad",
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
