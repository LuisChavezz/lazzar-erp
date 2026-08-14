import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmployee } from "../services/actions";
import { Employee } from "../interfaces/employee.interface";

/**
 * Detalle de un empleado. Mismo patrón que `useCustomer`: siembra `initialData`
 * desde la caché para que la página pinte de inmediato al llegar desde el
 * listado, y aun así refetchea. Entrar por URL directa no tiene caché y
 * simplemente carga.
 *
 * Sembrar desde la lista es válido aquí porque `list` y `retrieve` comparten
 * `EmpleadoSerializer` (`fields = '__all__'`), así que la fila del listado ES
 * el detalle completo.
 */
export const useEmployee = (employeeId: string) => {
  const queryClient = useQueryClient();
  const numericId = Number(employeeId);

  return useQuery<Employee>({
    queryKey: ["employees", numericId],
    queryFn: () => getEmployee(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
    initialData: () => {
      const fromDetailCache = queryClient.getQueryData<Employee>(["employees", numericId]);
      if (fromDetailCache) {
        return fromDetailCache;
      }
      const employees = queryClient.getQueryData<Employee[]>(["employees"]);
      return employees?.find((item) => item.id === numericId);
    },
  });
};
