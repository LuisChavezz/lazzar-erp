import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

// Página principal de Capital Humano — índice de sus sub-grupos.
export default function HrPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="hr" />
    </div>
  );
}
