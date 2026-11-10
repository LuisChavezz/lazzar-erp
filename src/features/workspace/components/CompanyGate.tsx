"use client";

import { usePathname } from "next/navigation";
import { Loader } from "@/src/components/Loader";
import { ErrorDisplay } from "@/src/components/ui/ErrorDisplay";
import { useSessionCompany } from "../hooks/useSessionCompany";
import NoCompanyState from "./NoCompanyState";

interface CompanyGateProps {
  children: React.ReactNode;
  /**
   * Prefijos de ruta que NO dependen de la empresa (p. ej. calendario y correos
   * de Google en Ventas): se renderizan siempre.
   */
  exempt?: readonly string[];
}

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Gate de empresa de un grupo de módulos (EC-842). Desde EC-798 el backend acota
 * ventas, finanzas y terceros SOLO por `user.empresa`: sin empresa, cada lista
 * saldría vacía sin explicar por qué. Este gate, puesto en el layout del grupo,
 * no monta las páginas (ni sus consultas) hasta confirmar la empresa de la
 * sesión, y si el usuario no tiene muestra el aviso en su lugar.
 *
 * Solo reemplaza el contenido de la ruta: el `ModuleNav` del layout sigue
 * visible. Con empresa, renderiza a los hijos tal cual (las tablas conservan
 * sus propios estados de carga y error).
 *
 * UX, no control de acceso: el backend es quien acota cada petición.
 */
export function CompanyGate({ children, exempt }: CompanyGateProps) {
  const pathname = usePathname();
  const sessionCompany = useSessionCompany();

  if (exempt?.some((prefix) => matchesPrefix(pathname, prefix))) return children;

  switch (sessionCompany.status) {
    case "ready":
      return children;
    case "none":
      return <NoCompanyState />;
    case "unknown":
      return (
        <ErrorDisplay
          title="No se pudo confirmar la empresa de tu usuario."
          message="Sin ella no se pueden cargar estos datos."
          onRetry={sessionCompany.retry}
        />
      );
    default:
      return (
        <div className="flex justify-center py-16" role="status" aria-label="Cargando">
          <Loader />
        </div>
      );
  }
}
