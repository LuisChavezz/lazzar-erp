import { Suspense } from "react";
import { PickingView } from "@/src/features/picking/components/PickingView";

// `<Suspense>`: la lista en modo servidor lee su estado de la URL (`useSearchParams`).
export default function PickingPage() {
  return (
    <div className="w-full">
      <Suspense>
        <PickingView />
      </Suspense>
    </div>
  );
}
