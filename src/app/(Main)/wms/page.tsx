import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

// Página principal de Operaciones de Almacén — índice de sus sub-grupos.
export default function WmsPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="wms" />
    </div>
  );
}
