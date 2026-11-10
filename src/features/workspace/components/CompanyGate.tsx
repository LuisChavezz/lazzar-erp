"use client";

import { usePathname } from "next/navigation";
import ModuleNav from "@/src/components/ModuleNav";
import { Loader } from "@/src/components/Loader";
import { ErrorDisplay } from "@/src/components/ui/ErrorDisplay";
import { isCompanyGatedPath } from "@/src/constants/companyGatedRoutes";
import { useSessionCompany } from "../hooks/useSessionCompany";
import NoCompanyState from "./NoCompanyState";

/**
 * Gate de empresa de (Main) (EC-842). Montado UNA vez en el layout; qué rutas
 * bloquea lo decide `companyGatedRoutes`. En una ruta bloqueada no monta la
 * página (ni sus consultas) hasta confirmar la empresa de la sesión, y si el
 * usuario no tiene muestra el aviso en su lugar.
 *
 * Mientras bloquea pinta el `ModuleNav` del módulo de la ruta (lo deduce de la
 * ruta; `/orders` no tiene), para que el aviso quede bajo la navegación como en
 * cualquier página del módulo. Con empresa renderiza a los hijos tal cual (las
 * tablas conservan sus propios estados de carga y error).
 *
 * UX, no control de acceso: el backend es quien acota cada petición.
 */
export function CompanyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sessionCompany = useSessionCompany();

  if (!isCompanyGatedPath(pathname) || sessionCompany.status === "ready") return children;

  let content: React.ReactNode;
  switch (sessionCompany.status) {
    case "none":
      content = <NoCompanyState />;
      break;
    case "session-error":
      // Mismo texto y misma ronda de recuperación que el aviso del sidebar.
      content = (
        <ErrorDisplay
          title="No se pudo cargar tu sesión."
          message="Sin ella no se pueden cargar estos datos."
          onRetry={sessionCompany.retry}
        />
      );
      break;
    case "unknown":
      content = (
        <ErrorDisplay
          title="No se pudo confirmar la empresa de tu usuario."
          message="Sin ella no se pueden cargar estos datos."
          onRetry={sessionCompany.retry}
        />
      );
      break;
    default:
      content = (
        <div className="flex justify-center py-16" role="status" aria-label="Cargando">
          <Loader />
        </div>
      );
  }

  return (
    <div className="w-full space-y-6">
      <ModuleNav />
      {content}
    </div>
  );
}
