import { useQuery } from "@tanstack/react-query";
import { getUnitsOfMeasure } from "../services/actions";
import { UnitOfMeasure } from "../interfaces/unit-of-measure.interface";

export const useUnitsOfMeasure = () => {
  const {
    data: units = [],
    isLoading,
    isError,
    error,
  } = useQuery<UnitOfMeasure[]>({
    queryKey: ["units-of-measure"],
    queryFn: getUnitsOfMeasure,
  });

  return {
    units,
    isLoading,
    isError,
    error,
  };
};
