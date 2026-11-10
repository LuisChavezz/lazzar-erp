import ModuleNav from "@/src/components/ModuleNav";
import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <ModuleNav moduleKey="finance" />
      <CompanyGate>{children}</CompanyGate>
    </div>
  );
}
