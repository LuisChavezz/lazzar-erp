"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { CustomerResumenKpis, CustomerResumenKpisSkeleton } from "./CustomerResumenKpis";
import { CustomerResumenPedidos } from "./CustomerResumenPedidos";
import { useCustomer } from "../hooks/useCustomer";

interface CustomerDetailContentProps {
  customerId: string;
}

export const CustomerDetailContent = ({ customerId }: CustomerDetailContentProps) => {
  const router = useRouter();
  const { data, isPlaceholderData, isError, error, isValidId, hasLoaded } =
    useCustomer(customerId);

  const backButton = (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <button
        type="button"
        onClick={() => router.replace("/sales/customers")}
        className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Volver</span>
      </button>
    </div>
  );

  // Con id inválido la query está deshabilitada y nunca sale de `pending`: se
  // resuelve ANTES de mirar la carga para no quedar atorado en el `Loader`.
  if (!isValidId) {
    return (
      <div className="w-full space-y-8">
        {backButton}
        <ErrorState title="Cliente no válido" message="El identificador del cliente no es válido." />
      </div>
    );
  }

  // Error de pantalla completa SOLO si nunca hubo respuesta real. Un refetch
  // fallido con datos ya cargados conserva la vista (y `useHasLoadedQuery`
  // avisa por toast).
  if (isInitialLoadError(isError, hasLoaded)) {
    return (
      <div className="w-full space-y-8">
        {backButton}
        <ErrorState
          title="No se pudo cargar el cliente"
          message={extractErrorMessage(error, "No existe, no tienes acceso a él o falló la conexión.")}
        />
      </div>
    );
  }

  // Sin datos ni placeholder: carga inicial en curso (id válido ⇒ query activa).
  if (!data) {
    return <Loader title="Cargando cliente" message="Obteniendo detalle del cliente..." />;
  }

  // El resumen solo existe en la respuesta REAL del detalle: mientras se
  // muestra la fila del listado (placeholder) se pinta un estado de carga,
  // nunca ceros ni "sin pedidos".
  const resumen = isPlaceholderData ? undefined : data.resumen_comercial;

  let content: ReactNode;
  if (resumen) {
    content = (
      <>
        <CustomerResumenKpis resumen={resumen} />
        <CustomerResumenPedidos resumen={resumen} />
      </>
    );
  } else if (isPlaceholderData) {
    content = <CustomerResumenKpisSkeleton />;
  } else {
    // Respuesta real sin el bloque: no se inventan valores.
    content = (
      <ErrorState
        title="Resumen comercial no disponible"
        message="El servidor no devolvió el resumen comercial de este cliente."
      />
    );
  }

  return (
    <div className="w-full space-y-8">
      {backButton}

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.nombre}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data.razon_social} · {data.correo}
        </p>
      </div>

      {content}
    </div>
  );
};
