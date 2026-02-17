const ROUTE_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/dashboard": "Dashboard",
  "/config": "Configuración",
  "/orders": "Pedidos",
  "/production": "Producción",
  "/inventories": "Inventarios",
  "/purchase-orders": "Órdenes de Compra",
  "/receipts": "Recepciones",
  "/invoicing": "Facturación",
  "/accounts-payable": "CxP (Pagar)",
  "/accounts-receivable": "CxC (Cobrar)",
  "/bank-accounts": "Bancos",
  "/accounting": "Contabilidad",
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
