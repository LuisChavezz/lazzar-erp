import { ProcurementRouteSkeleton } from "@/src/components/ProcurementRouteSkeleton";

// Mismo contenedor que la página (`w-full space-y-6 pt-2`).
export default function Loading() {
  return (
    <div className="w-full space-y-6 pt-2">
      <ProcurementRouteSkeleton variant="detail" />
    </div>
  );
}
