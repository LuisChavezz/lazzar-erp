import type { Metadata } from "next";
import { StockPage } from "@/src/features/stock/components/StockPage";

export const metadata: Metadata = {
  title: "Existencias | Producción | ERP",
};

/** Existencias desde Producción. */
export default function ManufacturingStockPage() {
  return <StockPage />;
}
