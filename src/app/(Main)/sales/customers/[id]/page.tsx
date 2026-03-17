import { CustomerDetailContent } from "@/src/features/customers/components/CustomerDetailContent";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="w-full space-y-6 pt-2">
      <CustomerDetailContent customerId={id} />
    </div>
  );
}
