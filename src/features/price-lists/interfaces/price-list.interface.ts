export interface PriceListItem {
  id: string;
  code: string;
  name: string;
  currency: string;
  itemsCount: number;
  margin: number;
  status: "Activa" | "Borrador" | "Archivada";
  lastUpdate: string;
}
