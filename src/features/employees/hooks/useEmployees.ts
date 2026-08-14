import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "../services/actions";
import { Employee } from "../interfaces/employee.interface";

export const useEmployees = () => {
  const {
    data: employees = [],
    isLoading,
    isError,
    error,
  } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  return {
    employees,
    isLoading,
    isError,
    error,
  };
};
