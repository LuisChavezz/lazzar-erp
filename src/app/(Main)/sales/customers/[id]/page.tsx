import { CustomerDetailContent } from "@/src/features/customers/components/CustomerDetailContent";
import { CUSTOMER_LIST_PARAM } from "@/src/features/customers/constants/customerRoutes";

/**
 * El parámetro `lista` de esta URL es el estado del listado del que se llegó
 * (lo pone "Ver detalle"): la query se pasa cruda y el detalle la valida para
 * su "Volver" (`readCustomerListParam`).
 */
export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <div className="w-full space-y-6 pt-2">
      <CustomerDetailContent customerId={id} listParam={query[CUSTOMER_LIST_PARAM]} />
    </div>
  );
}
