import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "../services/actions";
import { Department } from "../interfaces/department.interface";

export const useDepartments = () => {
  const {
    data: departments = [],
    isLoading,
    isError,
    error,
  } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  return {
    departments,
    isLoading,
    isError,
    error,
  };
};
