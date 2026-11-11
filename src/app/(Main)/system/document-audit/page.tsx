import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { DocumentAuditView } from "@/src/features/document-audit/components/DocumentAuditView";

/**
 * Bitácora de documentos (EC-854). Sin regla propia de permisos: la cubre el
 * prefijo `/system` → `R-CORE` o `R-CORE-REPORTES` de `routePermissions`, los
 * mismos códigos que exige el backend. `Suspense` porque los filtros viven en
 * la URL (`useSearchParams`).
 */
export default function SystemDocumentAuditPage() {
  return (
    <Suspense fallback={<Loader className="py-20" title="Cargando bitácora..." />}>
      <DocumentAuditView />
    </Suspense>
  );
}
