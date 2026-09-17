import CostCenterList from "@/src/features/cost-centers/components/CostCenterList";

/**
 * Centros de costo (EC-140). Sin regla propia de permisos: la cubre el catch-all
 * `/finance` → `R-CONTABILIDAD`.
 */
export default function CostCentersPage() {
  return (
    <div className="w-full">
      <CostCenterList />
    </div>
  );
}
