import OrderForm from "@/src/features/orders/components/OrderForm";

export default async function OrdersEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="w-full space-y-6 pt-2">
      <OrderForm orderId={id} />
    </div>
  );
}
