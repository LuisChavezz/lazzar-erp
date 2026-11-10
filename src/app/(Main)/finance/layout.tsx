import ModuleNav from "@/src/components/ModuleNav";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <ModuleNav moduleKey="finance" />
      {children}
    </div>
  );
}
