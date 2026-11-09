import { PreOrderPageContent } from "@/src/features/pre-orders/components/PreOrderPageContent";

/** Detalle de una pre-orden (`GET /produccion/pre-ordenes/{id}/`). Cae en la regla `/manufacturing`. */
export default async function PreOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="w-full pt-2">
      <PreOrderPageContent preOrderId={id} />
    </div>
  );
}
