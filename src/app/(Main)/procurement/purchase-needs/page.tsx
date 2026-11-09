import type { Metadata } from "next";
import { PurchaseNeedsView } from "@/src/features/purchase-needs/components/PurchaseNeedsView";

export const metadata: Metadata = {
  title: "Necesidades de compra | Compras | ERP",
  description: "Faltantes de material de las pre-órdenes, agrupados por material para comprarlos juntos.",
};

// Necesidades de compra: se juntan por material y se convierten en UNA OC.
export default function PurchaseNeedsPage() {
  return (
    <div className="w-full">
      <PurchaseNeedsView />
    </div>
  );
}
