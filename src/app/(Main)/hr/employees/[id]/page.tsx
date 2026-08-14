import { EmployeeDetailContent } from "@/src/features/employees/components/EmployeeDetailContent";

export default async function HrEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="w-full space-y-6 pt-2">
      <EmployeeDetailContent employeeId={id} />
    </div>
  );
}
