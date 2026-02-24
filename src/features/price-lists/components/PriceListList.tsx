import { DataTable } from "@/src/components/DataTable";
import { priceListColumns } from "./PriceListColumns";
import { PriceListItem } from "../interfaces/price-list.interface";

const PRICE_LIST_DATA: PriceListItem[] = [
  {
    id: "PL-001",
    code: "LP-2026-BASE",
    name: "Lista Base Nacional",
    currency: "MXN",
    itemsCount: 320,
    margin: 28.5,
    status: "Activa",
    lastUpdate: "12 Feb 2026",
  },
  {
    id: "PL-002",
    code: "LP-2026-RETAIL",
    name: "Lista Retail Norte",
    currency: "MXN",
    itemsCount: 180,
    margin: 31.2,
    status: "Activa",
    lastUpdate: "10 Feb 2026",
  },
  {
    id: "PL-003",
    code: "LP-2026-EXPORT",
    name: "Lista Exportación USD",
    currency: "USD",
    itemsCount: 95,
    margin: 24.8,
    status: "Borrador",
    lastUpdate: "08 Feb 2026",
  },
  {
    id: "PL-004",
    code: "LP-2025-MAYOR",
    name: "Lista Mayoreo Centro",
    currency: "MXN",
    itemsCount: 210,
    margin: 26.4,
    status: "Activa",
    lastUpdate: "06 Feb 2026",
  },
  {
    id: "PL-005",
    code: "LP-2024-LEGACY",
    name: "Lista Legacy 2024",
    currency: "MXN",
    itemsCount: 140,
    margin: 22.1,
    status: "Archivada",
    lastUpdate: "20 Dic 2025",
  },
];

export const PriceListList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={priceListColumns}
        data={PRICE_LIST_DATA}
        title="Listas de Precios"
        searchPlaceholder="Buscar por código, lista o moneda..."
      />
    </div>
  );
};
