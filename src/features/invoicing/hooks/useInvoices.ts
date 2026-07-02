import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getInvoices } from "../services/actions";
import { Invoice } from "../interfaces/invoice.interface";

export const useInvoices = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    Invoice[]
  >({
    queryKey: ["invoices"],
    queryFn: getInvoices,
  });

  // `data` solo se define tras una carga exitosa y se conserva aunque un
  // refetch posterior falle: distingue "cargó vacío" de "nunca cargó".
  const hasLoaded = data !== undefined;

  // Cuando un refetch en segundo plano falla pero seguimos mostrando datos en
  // caché, avisamos de forma no destructiva. El id fijo colapsa el aviso a un
  // solo toast aunque varios componentes usen el hook, y no se dispara en el
  // fallo de carga inicial (ese caso lo cubre el estado de error de la lista).
  useEffect(() => {
    if (isError && hasLoaded) {
      toast.error(
        "No se pudo actualizar la información. Mostrando datos anteriores.",
        { id: "invoices-refetch-error" },
      );
    }
  }, [isError, hasLoaded]);

  return {
    invoices: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
